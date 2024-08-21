package whiteListJoinIdo

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func GetMerkleProofForAddress(walletAddress string) ([]string, error) {
	// 获取当前工作目录
	currentDir, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("error getting current working directory: %v", err)
	}

	// 构建绝对路径
	scriptPath := filepath.Join(currentDir, "merkle_tree.js")

	// 构建执行命令
	cmd := exec.Command("node", scriptPath, walletAddress)

	var out bytes.Buffer
	cmd.Stdout = &out
	err = cmd.Run()
	if err != nil {
		log.Println("错误:: 未在同目录下找到 whiteList.json")
		return nil, fmt.Errorf("error running script: %v", err)
	}

	// 解析 JSON 输出
	var result map[string]interface{}
	if err := json.Unmarshal(out.Bytes(), &result); err != nil {
		return nil, fmt.Errorf("error parsing JSON output: %v", err)
	}

	// 提取 Merkle Proof
	proof := strings.Split(result["proof"].(string), ",")
	if len(proof) == 0 {
		return nil, fmt.Errorf("no Merkle proof found")
	}

	isWhiteList := result["isWhiteList"].(bool)
	fmt.Println(walletAddress, " 是否在白名单内:: ", isWhiteList)

	return proof, nil
}
