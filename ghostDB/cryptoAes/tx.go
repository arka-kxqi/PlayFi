package cryptoAes

import (
	"context"
	"crypto/ecdsa"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"log"
	"math/big"
	"time"
)

// Transfer 转账函数
func Transfer(client *ethclient.Client, fromAddress common.Address, privateKeyECDSA *ecdsa.PrivateKey, toAddress string, amount int64) (txHash string) {
	// 获取nonce
waitNodeNonce:
	time.Sleep(5 * time.Second)

	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Printf("错误:: 无法获取nonce: %v", err)
		log.Println("请等待:: 节点繁忙")
		goto waitNodeNonce
	}
	// 设置转账金额，这里以Wei为单位
	value := big.NewInt(amount) // 60000000000000  = 0.00006
	// 设置gas价格
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Printf("错误:: 无法获取建议的gas价格: %v", err)
		log.Println("请等待:: 节点繁忙")
		goto waitNodeNonce
	}

	// 设置接收方地址
	toAddressHex := common.HexToAddress(toAddress)

	// 创建交易
	var data []byte
	tx := types.NewTransaction(nonce, toAddressHex, value, uint64(71000), gasPrice, data)

	// 签署交易
	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		log.Fatalf("错误:: 无法获取网络ID: %v", err)
	}
	log.Println("nonce::", nonce)
	log.Println("发送的金额", value)
	log.Println("tx Gas:: ", tx.Gas())
	log.Println("tx GasPrice:: ", gasPrice)
	log.Println("tx data::", tx.Data())

	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKeyECDSA)
	if err != nil {
		log.Fatalf("错误:: 无法签名交易: %v", err)
	}

	// 发送交易
	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		log.Fatalf("错误:: 无法发送交易: %v", err)
	}

	time.Sleep(6 * time.Second)
	return signedTx.Hash().Hex()
}

// BatchMintTx 批量mint
func BatchMintTx(client *ethclient.Client, fromAddress common.Address, privateKeyECDSA *ecdsa.PrivateKey, toAddress string, amount int64, data []byte) (txHash string) {
	// 获取nonce
waitNodeNonce:
	time.Sleep(2 * time.Second)

	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Printf("错误:: 无法获取nonce: %v", err)
		log.Println("请等待:: 节点繁忙")
		goto waitNodeNonce
	}

	value := big.NewInt(amount)

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Printf("错误:: 无法获取建议的gas价格: %v", err)
		log.Println("请等待:: 节点繁忙")
		goto waitNodeNonce
	}

	// 设置接收方地址(这里指的是合约地址)
	toAddressHex := common.HexToAddress(toAddress)

	tx := types.NewTransaction(nonce, toAddressHex, value, uint64(6721975), gasPrice, data)

	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		log.Fatalf("错误:: 无法获取网络ID: %v", err)
	}

	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKeyECDSA)
	if err != nil {
		log.Fatalf("错误:: 无法签名交易: %v", err)
	}

	// 发送交易
	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		log.Fatalf("错误:: 无法发送交易: %v", err)
	}

	time.Sleep(2 * time.Second)
	return signedTx.Hash().Hex()
}
