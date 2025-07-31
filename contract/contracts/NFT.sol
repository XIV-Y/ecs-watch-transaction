// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFT is ERC721, Ownable {
  using Strings for uint256;
  
  uint256 private _nextTokenId;
  
  mapping(uint256 => string) private _tokenURIs;
  
  constructor(
    string memory name,
    string memory symbol
  ) ERC721(name, symbol) Ownable(msg.sender) {}
  
  function mint(address to, string memory newTokenURI) public onlyOwner {
    uint256 tokenId = _nextTokenId++;
    _safeMint(to, tokenId);
    _setTokenURI(tokenId, newTokenURI);
  }
  
  function batchMint(address to, string[] memory tokenURIs) public onlyOwner {
    for (uint256 i = 0; i < tokenURIs.length; i++) {
      uint256 tokenId = _nextTokenId++;
      _safeMint(to, tokenId);
      _setTokenURI(tokenId, tokenURIs[i]);
    }
  }
  
  function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
    require(_ownerOf(tokenId) != address(0), "URI set of nonexistent token");
    _tokenURIs[tokenId] = _tokenURI;
  }
  
  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_ownerOf(tokenId) != address(0), "URI query for nonexistent token");
    return _tokenURIs[tokenId];
  }
  
  function totalSupply() public view returns (uint256) {
    return _nextTokenId;
  }
}
