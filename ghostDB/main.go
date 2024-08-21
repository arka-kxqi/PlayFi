package main

import (
	"database/sql"
	"fmt"
	"ghostDB/cryptoAes"
	_ "github.com/mattn/go-sqlite3"
	"log"
	"strconv"
)

var (
	key = []byte("XCY03LX06ZLQN30J") // 16字节的秘钥
	iv  = []byte("KM97SH196CXCY6C9") // 16字节的偏移量
)

func main() {
	db, err := sql.Open("sqlite3", "ghostWallets.db")
	if err != nil {
		log.Fatalf("打开数据库失败: %v", err)
	}
	defer db.Close()

	for {
		var input string
		fmt.Println("请输入编号 (1-500): ")
		_, err := fmt.Scan(&input)
		if err != nil {
			log.Fatalf("读取输入失败: %v", err)
		}

		id, err := strconv.Atoi(input)
		if err != nil || id < 1 || id > 500 {
			fmt.Println("编号无效，请输入1到500之间的数字")
			continue
		}

		var address string
		var encryptedPrivateKey string
		err = db.QueryRow("SELECT address, encryptedPrivateKey FROM wallets WHERE id = ?", id).Scan(&address, &encryptedPrivateKey)
		if err != nil {
			log.Fatalf("查询数据库失败: %v", err)
		}

		// 解密私钥
		privateKey, err := cryptoAes.DecryptByinv(key, iv, encryptedPrivateKey)
		if err != nil {
			log.Fatalf("解密私钥失败: %v", err)
		}

		// 输出结果
		log.Println("-----------------------------------")
		fmt.Println("钱包编号:", id)
		fmt.Printf("钱包地址: %s\n", address)
		fmt.Printf("私钥: %s\n", privateKey)
		log.Println("-----------------------------------")
	}
}
