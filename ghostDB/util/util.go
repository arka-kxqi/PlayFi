package util

import (
	"fmt"
	"math/big"
)

// ConvertEtherToWei 将以太转换为Wei
func ConvertEtherToWei(etherAmount string) (*big.Int, error) {
	ether, ok := new(big.Float).SetString(etherAmount)
	if !ok {
		return nil, fmt.Errorf("invalid ether amount: %s", etherAmount)
	}

	weiFactor := new(big.Float).SetFloat64(1e18)
	wei := new(big.Float).Mul(ether, weiFactor)
	weiInt, _ := wei.Int(nil)

	return weiInt, nil
}

func ConvertWeiToEther(weiAmount string) (string, error) {
	// 将字符串形式的Wei金额转换为大整数类型
	wei, ok := new(big.Int).SetString(weiAmount, 10)
	if !ok {
		return "", fmt.Errorf("invalid wei amount: %s", weiAmount)
	}

	weiFloat := new(big.Float).SetInt(wei)
	etherFactor := new(big.Float).SetFloat64(1e18)
	ether := new(big.Float).Quo(weiFloat, etherFactor)

	return ether.Text('f', 18), nil
}
