package getWalletPri

import (
	"database/sql"
	"fmt"
	"ghostDB/cryptoAes"
	_ "github.com/mattn/go-sqlite3"
	"log"
)

var (
	key = []byte("XCY03LX06ZLQN30J") // 16字节的秘钥
	iv  = []byte("KM97SH196CXCY6C9") // 16字节的偏移量
)

func GetWalletPri(pre, after int) {
	db, err := sql.Open("sqlite3", "../../ghostWallets.db")
	if err != nil {
		log.Fatalf("打开数据库失败: %v", err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, address, encryptedPrivateKey FROM wallets WHERE id BETWEEN ? AND ?", pre, after)
	if err != nil {
		log.Fatalf("查询数据库失败: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int
		var address string
		var encryptedPrivateKey string

		err := rows.Scan(&id, &address, &encryptedPrivateKey)
		if err != nil {
			log.Printf("扫描行数据失败: %v", err)
			continue
		}

		// 解密私钥
		privateKey, err := cryptoAes.DecryptByinv(key, iv, encryptedPrivateKey)
		if err != nil {
			log.Printf("解密私钥失败: %v", err)
			continue
		}

		// 输出结果
		log.Println("-----------------------------------")
		fmt.Println("钱包编号:", id)
		fmt.Printf("🎒 钱包地址: %s\n", address)
		fmt.Printf("🎒 私钥: %s\n", privateKey)
		log.Println("-----------------------------------")
	}

	if err := rows.Err(); err != nil {
		log.Fatalf("查询钱包私钥,处理行数据时发生错误: %v", err)
	}
}
