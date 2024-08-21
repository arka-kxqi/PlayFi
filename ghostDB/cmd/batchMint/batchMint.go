package batchMint

import (
	"database/sql"
	"fmt"
	"ghostDB/cmd/whiteListJoinIdo"
	"ghostDB/cryptoAes"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/patrickmn/go-cache"
	"io/ioutil"
	"log"
	"strings"
	"time"
)

var (
	key = []byte("XCY03LX06ZLQN30J") // 16字节的秘钥
	iv  = []byte("KM97SH196CXCY6C9") // 16字节的偏移量
)

func BatchMint(memoryCache *cache.Cache, pre, after int, contractAddress, abiFileName, mintFuncName string) {
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

	abiBytes, err := ioutil.ReadFile(abiFileName)
	if err != nil {
		fmt.Println("Error reading ABI file:", err)
		return
	}

	// 解析 ABI
	contractABI, err := abi.JSON(strings.NewReader(string(abiBytes)))
	if err != nil {
		fmt.Println("Error parsing ABI:", err)
		return
	}

	data, err := contractABI.Pack(mintFuncName)
	if err != nil {
		fmt.Println("Error packing data:", err)
		return
	}

	// 从数据库中读取所有钱包的加密私钥
	rows, err := db.Query("SELECT id, address, encryptedPrivateKey FROM wallets WHERE  id  between ? AND ?", pre, after)
	if err != nil {
		log.Fatal("查询数据库失败：", err)
	}
	defer rows.Close()
	fmt.Println("正在读取数据库中的钱包信息...")

	for rows.Next() {
		var id int
		var address, encryptedPrivateKey string
		err = rows.Scan(&id, &address, &encryptedPrivateKey)
		if err != nil {
			log.Fatal("读取记录失败：", err)
		}

		// 解密私钥
		privateKey, err := cryptoAes.DecryptByinv(key, iv, encryptedPrivateKey)
		if err != nil {
			log.Fatalf("解密私钥失败: %v", err)
		}
		privateKeyECDSA, err := crypto.HexToECDSA(privateKey)
		if err != nil {
			log.Fatal("加载私钥失败：", err)
		}

		// 调用合约的 mint 函数
		txHash := cryptoAes.BatchMintTx(client, common.HexToAddress(address), privateKeyECDSA, contractAddress, 0, data)
		if err != nil {
			log.Fatalf("调用合约失败: %v", err)
		}
		fmt.Println("🔨", id, "正在mint的钱包地址::--", address, "成功，交易哈希:", txHash)
		time.Sleep(2 * time.Second)
		fmt.Println("-------------------------------------------------------------------------------------")

	}
	// 检查是否有错误发生在迭代过程中
	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}
	log.Println("Done")
}

func WithWhiteListBatchMint(memoryCache *cache.Cache, pre, after int, contractAddress, abiFileName, mintFuncName string) {
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

	abiBytes, err := ioutil.ReadFile(abiFileName)
	if err != nil {
		fmt.Println("Error reading ABI file:", err)
		return
	}

	// 解析 ABI
	contractABI, err := abi.JSON(strings.NewReader(string(abiBytes)))
	if err != nil {
		fmt.Println("Error parsing ABI:", err)
		return
	}

	// 从数据库中读取所有钱包的加密私钥
	rows, err := db.Query("SELECT id, address, encryptedPrivateKey FROM wallets WHERE  id  between ? AND ?", pre, after)
	if err != nil {
		log.Fatal("查询数据库失败：", err)
	}
	defer rows.Close()
	fmt.Println("正在读取数据库中的钱包信息...")

	for rows.Next() {
		var id int
		var address, encryptedPrivateKey string
		err = rows.Scan(&id, &address, &encryptedPrivateKey)
		if err != nil {
			log.Fatal("读取记录失败：", err)
		}

		// 解密私钥
		privateKey, err := cryptoAes.DecryptByinv(key, iv, encryptedPrivateKey)
		if err != nil {
			log.Fatalf("解密私钥失败: %v", err)
		}
		privateKeyECDSA, err := crypto.HexToECDSA(privateKey)
		if err != nil {
			log.Fatal("加载私钥失败：", err)
		}

		// 得到每个地址的proof,发送的金额  proof是 []string
		proof, err := whiteListJoinIdo.GetMerkleProofForAddress(address)
		if err != nil {
			fmt.Println("Error getting Merkle Proof:", err)
			return
		}

		// 将 []string 转换为 []bytes32
		proofBytes32 := make([][32]byte, len(proof))
		for i, p := range proof {
			proofBytes32[i] = common.HexToHash(p)
		}

		data, err := contractABI.Pack(mintFuncName, proofBytes32)
		if err != nil {
			fmt.Println("Error packing data:", err)
			return
		}

		// 调用合约的 mint 函数
		txHash := cryptoAes.BatchMintTx(client, common.HexToAddress(address), privateKeyECDSA, contractAddress, 0, data)
		if err != nil {
			log.Fatalf("调用合约失败: %v", err)
		}
		fmt.Println("🔨", id, "正在mint的钱包地址::--", address, "成功，交易哈希:", txHash)
		time.Sleep(2 * time.Second)
		fmt.Println("-------------------------------------------------------------------------------------")

	}
	// 检查是否有错误发生在迭代过程中
	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}
	log.Println("Done")
}
