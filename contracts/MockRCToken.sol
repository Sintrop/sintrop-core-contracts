// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockRCToken
 * @dev Mock ERC20 token for testing RCMarket
 */
contract MockRCToken {
    mapping(address => uint256) private _balances;
    
    string public name = "Regeneration Credit";
    string public symbol = "RC";
    uint8 public decimals = 18;
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
    }
    
    function burn(address from, uint256 amount) external {
        require(_balances[from] >= amount, "Insufficient balance");
        _balances[from] -= amount;
    }
}