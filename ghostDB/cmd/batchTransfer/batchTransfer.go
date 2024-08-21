package batchTransfer

import (
	"database/sql"
	"fmt"
	"ghostDB/cryptoAes"
	"ghostDB/util"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	_ "github.com/mattn/go-sqlite3"
	"github.com/patrickmn/go-cache"
	"log"
	"math/big"
)

func BatchTransfer(memoryCache *cache.Cache, pre, after int, amount *big.Int) {
	db, err := sql.Open("sqlite3", "../../ghostWallets.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// RPC URL 和 ChainID
	nodeUrl, ok := memoryCache.Get("netNode")
	if !ok {
		log.Println("错误:: 无法获取网络节点")
		return
	}
	rpcURL, _ := nodeUrl.(string)

	// 连接到区块链
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		log.Println("rpcURL::", rpcURL)
		log.Printf("错误::无法连接到区块链网络: %v", err)
		return
	}
	privateKey, ok := memoryCache.Get("privateKey")
	if !ok {
		log.Println("错误:: 还未设置主钱包")
		return
	}
	privateKeyHex, _ := privateKey.(string)

	privateKeyECDSA, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		log.Println("错误:: 加载私钥失败：", err)
		return
	}
	fromAddress := crypto.PubkeyToAddress(privateKeyECDSA.PublicKey)

	// 读取目标地址
	rows, err := db.Query("SELECT id,address FROM wallets WHERE id between ? and ?", pre, after)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int
		var toAddress string
		if err := rows.Scan(&id, &toAddress); err != nil {
			log.Println(id, " 错误:: 找不到该钱包地址", err)
			continue
		}
		weiToEther, _ := util.ConvertWeiToEther(amount.String())
		txHash := cryptoAes.Transfer(client, fromAddress, privateKeyECDSA, toAddress, amount.Int64())
		log.Println("🔨", id, "钱包地址是", toAddress, "已经发送", weiToEther, "(ether)主币消耗, 交易txhash: ", txHash)
		fmt.Println("-------------------------------------------------------------------------------------")

	}
	log.Println("Done")
}
