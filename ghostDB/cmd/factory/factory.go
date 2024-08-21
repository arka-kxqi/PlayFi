package main

import (
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"ghostDB/cryptoAes"
	"github.com/ethereum/go-ethereum/crypto"
	_ "github.com/mattn/go-sqlite3"
	"io/ioutil"
	"log"
)

var (
	key = []byte("XCY03LX06ZLQN30J") // 16字节的秘钥
	iv  = []byte("KM97SH196CXCY6C9") // 16字节的偏移量 =
)

// generateWallet 生成以太坊钱包地址和私钥
func generateWallet() (address, privateKey string, err error) {
	key, err := crypto.GenerateKey()
	if err != nil {
		return "", "", err
	}

	address = crypto.PubkeyToAddress(key.PublicKey).Hex()
	privateKeyBytes := crypto.FromECDSA(key)
	privateKey = hex.EncodeToString(privateKeyBytes)
	return
}

func main() {
	// 创建SQLite数据库
	db, err := sql.Open("sqlite3", "ghostWallets.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 创建表
	createTableSQL := `CREATE TABLE IF NOT EXISTS wallets (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"address" TEXT,
		"encryptedPrivateKey" BLOB
	);`
	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatal(err)
	}

	// 准备JSON输出
	var addresses []string

	for i := 0; i < 1500; i++ {
		address, privateKey, err := generateWallet()
		if err != nil {
			log.Fatal(err)
		}

		encryptedPrivateKey, err := cryptoAes.EncryptByinv(key, iv, privateKey)
		if err != nil {
			log.Fatal(err)
		}

		// 保存到数据库
		_, err = db.Exec("INSERT INTO wallets (address, encryptedPrivateKey) VALUES (?, ?)",
			address, encryptedPrivateKey)
		if err != nil {
			log.Fatal(err)
		}
		fmt.Println("追加成功", address)

		// 添加到JSON输出
		addresses = append(addresses, address)
	}

	// 将钱包地址输出到JSON文件
	jsonData, err := json.Marshal(addresses)
	if err != nil {
		log.Fatal(err)
	}
	if err = ioutil.WriteFile("ghostWallets.json", jsonData, 0644); err != nil {
		log.Fatal(err)
	}

	fmt.Println("成功生成1500个钱包地址，并保存到了ghostWallets.json和ghostWallets.db中")
}
