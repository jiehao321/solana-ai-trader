// 高级 Solidity 合约示例
// 包含多种 DeFi 功能和设计模式

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title 高级质押合约
 * @notice 支持多币种质押、复利计算、紧急暂停
 * @dev 演示多种 Solidity 设计模式
 */
contract AdvancedStaking is ReentrancyGuard, Pausable, Ownable {
    using Address for address;

    // ============ 数据结构 ============
    
    struct Pool {
        IERC20 stakeToken;      // 质押代币
        IERC20 rewardToken;     // 奖励代币
        uint256 totalStaked;    // 总质押量
        uint256 rewardPerSecond; // 每秒奖励
        uint256 lastUpdateTime;  // 上次更新时间
        uint256 accRewardPerShare; // 累计每股奖励
        uint256 lockPeriod;      // 锁定期（秒）
        bool isActive;           // 是否激活
    }

    struct UserInfo {
        uint256 amount;          // 质押数量
        uint256 rewardDebt;      // 已结算奖励
        uint256 lastStakeTime;   // 上次质押时间
        uint256 pendingRewards;  // 待领取奖励
    }

    // ============ 状态变量 ============
    
    // 池子 ID => 池子信息
    mapping(uint256 => Pool) public pools;
    
    // 池子 ID => 用户地址 => 用户信息
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    // 支持的池子数量
    uint256 public poolCount;
    
    // 紧急提款费率（基点，100 = 1%）
    uint256 public emergencyWithdrawFee = 1000; // 10%
    
    // 费用接收地址
    address public feeReceiver;

    // ============ 事件 ============
    
    event PoolCreated(uint256 indexed poolId, address stakeToken, address rewardToken);
    event Staked(uint256 indexed poolId, address indexed user, uint256 amount);
    event Withdrawn(uint256 indexed poolId, address indexed user, uint256 amount);
    event RewardClaimed(uint256 indexed poolId, address indexed user, uint256 amount);
    event EmergencyWithdraw(uint256 indexed poolId, address indexed user, uint256 amount, uint256 fee);

    // ============ 修饰器 ============
    
    modifier validPool(uint256 _poolId) {
        require(_poolId < poolCount, "Pool does not exist");
        require(pools[_poolId].isActive, "Pool is not active");
        _;
    }

    modifier updateReward(uint256 _poolId) {
        Pool storage pool = pools[_poolId];
        if (block.timestamp > pool.lastUpdateTime) {
            uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
            if (pool.totalStaked > 0) {
                uint256 reward = timeElapsed * pool.rewardPerSecond;
                pool.accRewardPerShare += (reward * 1e12) / pool.totalStaked;
            }
            pool.lastUpdateTime = block.timestamp;
        }
        _;
    }

    // ============ 构造函数 ============
    
    constructor(address _feeReceiver) Ownable(msg.sender) {
        feeReceiver = _feeReceiver;
    }

    // ============ 外部函数 ============
    
    /**
     * @notice 创建新的质押池
     * @param _stakeToken 质押代币地址
     * @param _rewardToken 奖励代币地址
     * @param _rewardPerSecond 每秒奖励数量
     * @param _lockPeriod 锁定期（秒）
     */
    function createPool(
        address _stakeToken,
        address _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _lockPeriod
    ) external onlyOwner {
        require(_stakeToken != address(0), "Invalid stake token");
        require(_rewardPerSecond > 0, "Invalid reward rate");

        uint256 poolId = poolCount++;
        
        pools[poolId] = Pool({
            stakeToken: IERC20(_stakeToken),
            rewardToken: IERC20(_rewardToken),
            totalStaked: 0,
            rewardPerSecond: _rewardPerSecond,
            lastUpdateTime: block.timestamp,
            accRewardPerShare: 0,
            lockPeriod: _lockPeriod,
            isActive: true
        });

        emit PoolCreated(poolId, _stakeToken, _rewardToken);
    }

    /**
     * @notice 质押代币
     * @param _poolId 池子 ID
     * @param _amount 质押数量
     */
    function stake(uint256 _poolId, uint256 _amount) 
        external 
        nonReentrant 
        whenNotPaused 
        validPool(_poolId) 
        updateReward(_poolId) 
    {
        require(_amount > 0, "Cannot stake 0");
        
        Pool storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        // 结算之前奖励
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
            user.pendingRewards += pending;
        }

        // 转账质押代币
        pool.stakeToken.transferFrom(msg.sender, address(this), _amount);
        
        // 更新用户数据
        user.amount += _amount;
        user.lastStakeTime = block.timestamp;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        
        // 更新池子数据
        pool.totalStaked += _amount;

        emit Staked(_poolId, msg.sender, _amount);
    }

    /**
     * @notice 提取质押和奖励
     * @param _poolId 池子 ID
     */
    function withdraw(uint256 _poolId) 
        external 
        nonReentrant 
        validPool(_poolId) 
        updateReward(_poolId) 
    {
        UserInfo storage user = userInfo[_poolId][msg.sender];
        Pool storage pool = pools[_poolId];
        
        require(user.amount > 0, "No stake to withdraw");
        require(
            block.timestamp >= user.lastStakeTime + pool.lockPeriod,
            "Still in lock period"
        );

        // 计算待领取奖励
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
        uint256 totalReward = user.pendingRewards + pending;

        uint256 stakedAmount = user.amount;
        
        // 重置用户数据
        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        
        // 更新池子数据
        pool.totalStaked -= stakedAmount;

        // 转账质押代币
        pool.stakeToken.transfer(msg.sender, stakedAmount);
        
        // 转账奖励代币
        if (totalReward > 0) {
            pool.rewardToken.transfer(msg.sender, totalReward);
            emit RewardClaimed(_poolId, msg.sender, totalReward);
        }

        emit Withdrawn(_poolId, msg.sender, stakedAmount);
    }

    /**
     * @notice 紧急提款（有手续费）
     * @param _poolId 池子 ID
     */
    function emergencyWithdraw(uint256 _poolId) 
        external 
        nonReentrant 
        validPool(_poolId) 
    {
        UserInfo storage user = userInfo[_poolId][msg.sender];
        Pool storage pool = pools[_poolId];
        
        require(user.amount > 0, "No stake to withdraw");

        uint256 stakedAmount = user.amount;
        uint256 fee = (stakedAmount * emergencyWithdrawFee) / 10000;
        uint256 receiveAmount = stakedAmount - fee;

        // 重置用户数据（放弃奖励）
        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        
        // 更新池子数据
        pool.totalStaked -= stakedAmount;

        // 转账（扣除手续费）
        pool.stakeToken.transfer(msg.sender, receiveAmount);
        pool.stakeToken.transfer(feeReceiver, fee);

        emit EmergencyWithdraw(_poolId, msg.sender, receiveAmount, fee);
    }

    /**
     * @notice 领取奖励（不提取质押）
     * @param _poolId 池子 ID
     */
    function claimReward(uint256 _poolId) 
        external 
        nonReentrant 
        validPool(_poolId) 
        updateReward(_poolId) 
    {
        UserInfo storage user = userInfo[_poolId][msg.sender];
        Pool storage pool = pools[_poolId];

        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
        uint256 totalReward = user.pendingRewards + pending;

        require(totalReward > 0, "No reward to claim");

        user.pendingRewards = 0;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;

        pool.rewardToken.transfer(msg.sender, totalReward);

        emit RewardClaimed(_poolId, msg.sender, totalReward);
    }

    // ============ 视图函数 ============
    
    /**
     * @notice 查询待领取奖励
     */
    function pendingReward(uint256 _poolId, address _user) external view returns (uint256) {
        Pool storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][_user];

        uint256 accRewardPerShare = pool.accRewardPerShare;
        
        if (block.timestamp > pool.lastUpdateTime && pool.totalStaked > 0) {
            uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
            uint256 reward = timeElapsed * pool.rewardPerSecond;
            accRewardPerShare += (reward * 1e12) / pool.totalStaked;
        }

        uint256 pending = (user.amount * accRewardPerShare) / 1e12 - user.rewardDebt;
        return user.pendingRewards + pending;
    }

    /**
     * @notice 查询用户质押信息
     */
    function getUserInfo(uint256 _poolId, address _user) external view returns (
        uint256 amount,
        uint256 pendingReward,
        uint256 lastStakeTime,
        uint256 unlockTime
    ) {
        UserInfo storage user = userInfo[_poolId][_user];
        Pool storage pool = pools[_poolId];
        
        amount = user.amount;
        pendingReward = this.pendingReward(_poolId, _user);
        lastStakeTime = user.lastStakeTime;
        unlockTime = user.lastStakeTime + pool.lockPeriod;
    }

    // ============ 管理员函数 ============
    
    function setEmergencyWithdrawFee(uint256 _fee) external onlyOwner {
        require(_fee <= 3000, "Fee too high"); // 最大 30%
        emergencyWithdrawFee = _fee;
    }

    function setFeeReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "Invalid address");
        feeReceiver = _receiver;
    }

    function updateRewardRate(uint256 _poolId, uint256 _newRate) external onlyOwner {
        Pool storage pool = pools[_poolId];
        pool.rewardPerSecond = _newRate;
    }

    function togglePool(uint256 _poolId) external onlyOwner {
        pools[_poolId].isActive = !pools[_poolId].isActive;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ 接收 ETH ============
    
    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }
}
