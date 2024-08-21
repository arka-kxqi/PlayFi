// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


contract MultisigWallet {

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public ownerCount;
    uint256 public threshold;
    uint256 public nonce;

    constructor(
        address[] memory _owners,
        uint256 _threshold
    ) {
        _setupOwners(_owners, _threshold);
    }

    event ExecutionSuccess(bytes32 txHash);
    event ExecutionFailure(bytes32 txHash);
    event Received(address sender, uint amount);
    event FallbackCalled(address sender, uint amount);


    function _setupOwners(address[] memory _owners, uint256 _threshold) internal {
        require(_threshold > 0, "The threshold can not be 0");
        require(_threshold <= _owners.length, "Multi-signature implementation threshold, less than, multi-signature number");
        require(_threshold >= 1, "Multi-signature implementation threshold of at least 1");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0) && owner != address(this) && !isOwner[owner], "Multi-signer can not be 0 address, this contract address, can not be repeated");
            owners.push(owner);
            isOwner[owner] = true;
        }
        ownerCount = _owners.length;
        threshold = _threshold;
    }


    function execTransaction(
        address to,
        uint256 value,
        bytes memory data,
        bytes memory signatures
    ) public payable virtual returns (bool success) {
        bytes32 txHash = encodeTransactionData(to, value, data, nonce, block.chainid);
        nonce++;
        checkSignatures(txHash, signatures);

        (success, ) = to.call{value: value}(data);
        require(success , "success is failed");
        if (success) emit ExecutionSuccess(txHash);
        else emit ExecutionFailure(txHash);
    }


    function checkSignatures(
        bytes32 dataHash,
        bytes memory signatures
    ) public view {
        uint256 _threshold = threshold;
        require(_threshold > 0, "The threshold can not be initialized to 0");

        require(signatures.length >= _threshold * 65, "Check that the signature is long enough");

        address lastOwner = address(0);
        address currentOwner;
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 i;
        for (i = 0; i < _threshold; i++) {
            (v, r, s) = signatureSplit(signatures, i);
            currentOwner = ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash)), v, r, s);
            require(currentOwner > lastOwner && isOwner[currentOwner], "Invalid signature");
            lastOwner = currentOwner;
        }
    }

    function signatureSplit(bytes memory signatures, uint256 pos) internal pure
    returns (
        uint8 v,
        bytes32 r,
        bytes32 s
    )
    {
        assembly {
            let signaturePos := mul(0x41, pos)
            r := mload(add(signatures, add(signaturePos, 0x20)))
            s := mload(add(signatures, add(signaturePos, 0x40)))
            v := and(mload(add(signatures, add(signaturePos, 0x41))), 0xff)
        }
    }

    function encodeTransactionData(
        address to,
        uint256 value,
        bytes memory data,
        uint256 _nonce,
        uint256 chainid
    ) public pure returns (bytes32) {
        bytes32 safeTxHash =
                        keccak256(
                abi.encode(
                    to,
                    value,
                    keccak256(data),
                    _nonce,
                    chainid
                )
            );
        return safeTxHash;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable {
        emit FallbackCalled(msg.sender, msg.value);
    }

    // test , Can Be deleted
    function receiveEther() external payable {
        require(msg.value > 0, "Must send some ether");
        emit Received(msg.sender, msg.value);
    }

}
