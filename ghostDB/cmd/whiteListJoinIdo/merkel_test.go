package whiteListJoinIdo

import (
	"fmt"
	"testing"
)

func Test_merkleTree(t *testing.T) {
	walletAddress := "0xDa4d4E69c42443aA181b90081909a893d51BdC84"
	proof, err := GetMerkleProofForAddress(walletAddress)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("Proof:", proof)
}
