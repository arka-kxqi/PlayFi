package main

import (
	"fmt"
	"ghostDB/cmd/batchMint"
	"ghostDB/cmd/batchTransfer"
	"ghostDB/cmd/getWalletPri"
	"ghostDB/cmd/integrate"
	"ghostDB/cmd/whiteListJoinIdo"
	"ghostDB/util"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/patrickmn/go-cache"
	"github.com/spf13/cobra"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
)

var (
	mainWallet  string
	netNode     = "http://localhost:8545"
	MemoryCache *cache.Cache
)

var rootCmd = &cobra.Command{
	Use:   "main",
	Short: "主页面",
	Run: func(cmd *cobra.Command, args []string) {
		for {
			fmt.Println("-------- 请选择一个功能项的编号: --------")
			fmt.Println("1. 归拢  Gas free")
			fmt.Println("2. 分发  Gas free")
			fmt.Println("3. 批量  Mint NFT")
			fmt.Println("4. 设置主钱包(目前的主钱包是:" + mainWallet + ")")
			fmt.Println("5. 设置网络节点(目前的网络节点是:" + netNode + ")")
			fmt.Println("6. 查看钱包地址私钥")
			fmt.Println("7. 批量  Join Ido")
			fmt.Println("-------- Ctrl + c 退出程序 --------")

			var choice int
			fmt.Print("请输入功能项编号: ")
			fmt.Scanln(&choice)

			switch choice {
			case 1:
				fmt.Println("请输入分发手续费的前置范围是:")
				var preRange string
				fmt.Scanln(&preRange)
				fmt.Println("请输入分发手续费的后置范围是:")
				var afterRange string
				fmt.Scanln(&afterRange)
				collectCmd.Run(cmd, []string{preRange, afterRange})
			case 2:
				fmt.Println("请输入分发手续费的前置范围是:")
				var preRange string
				fmt.Scanln(&preRange)
				fmt.Println("请输入分发手续费的后置范围是:")
				var afterRange string
				fmt.Scanln(&afterRange)
				fmt.Print("请输入分发手续费是多少(单位是ether): ")
				var distributeFeesArgs string
				fmt.Scanln(&distributeFeesArgs)
				distributeFeesCmd.Run(cmd, []string{preRange, afterRange, distributeFeesArgs})
			case 3:
				fmt.Println("请输入批量 mint 合约地址是: ")
				var mintContractAddress string
				fmt.Scanln(&mintContractAddress)
				fmt.Println("请输入该合约的abi文件的名称是(.json结尾文件): ")
				var abiFileName string
				fmt.Scanln(&abiFileName)
				fmt.Println("请输入批量mint的钱包地址的前置范围是:")
				var preRange string
				fmt.Scanln(&preRange)
				fmt.Println("请输入批量mint的钱包地址的后置范围是:")
				var afterRange string
				fmt.Scanln(&afterRange)
				fmt.Println("请输入合约中铸造NFT的函数名称(默认是mintNFT):")
				var mintFuncName string
				fmt.Scanln(&mintFuncName)
				fmt.Println("NFT合约是否采用白名单,如果是回复 1:")
				var whiteFileName string
				fmt.Scanln(&whiteFileName)
				batchMintCmd.Run(cmd, []string{preRange, afterRange, mintContractAddress, abiFileName, mintFuncName, whiteFileName})
			case 4:
				fmt.Print("请输入设置主钱包私钥: ")
				var setMainWalletArgs string
				fmt.Scanln(&setMainWalletArgs)
				setMainWalletCmd.Run(cmd, []string{setMainWalletArgs})

			case 5:
				fmt.Println("请选择网络节点的编号:")
				fmt.Println("0: http://localhost:8545")
				fmt.Println("1: https://b2-mainnet.alt.technology")
				fmt.Println("2: https://b2-testnet.alt.technology")
				fmt.Println("3: https://rpc.zklink.io (Nova Mainnet)")
				fmt.Println("4: https://sepolia.rpc.zklink.io (Nova Testnet)")

				var nodeChoice int
				fmt.Scanln(&nodeChoice)
				setNetNodeCmd.Run(cmd, []string{strconv.Itoa(nodeChoice)})

			case 6:
				fmt.Print("请输入查看钱包私钥的前置范围是: ")
				var preRange string
				fmt.Scanln(&preRange)
				fmt.Print("请输入查看钱包私钥的后置范围是: ")
				var afterRange string
				fmt.Scanln(&afterRange)
				getWalletKeyCmd.Run(cmd, []string{preRange, afterRange})

			case 7:
				fmt.Println("请输入批量 joinIdo 合约地址是: ")
				var mintContractAddress string
				fmt.Scanln(&mintContractAddress)
				fmt.Println("请输入该合约的abi文件的名称是(.json结尾文件): ")
				var abiFileName string
				fmt.Scanln(&abiFileName)
				fmt.Println("请输入批量joinIdo的钱包地址的前置范围是:")
				var preRange string
				fmt.Scanln(&preRange)
				fmt.Println("请输入批量joinIdo的钱包地址的后置范围是:")
				var afterRange string
				fmt.Scanln(&afterRange)
				fmt.Println("请输入合约中加入Ido的函数名称(默认是joinIdo):")
				var joinIdoFuncName string
				fmt.Scanln(&joinIdoFuncName)

				fmt.Println("请输入joinIdo的金额(单位是ether)")
				var joinIdoAmount string
				fmt.Scanln(&joinIdoAmount)

				fmt.Println("ido合约是否采用白名单,如果是回复 1:")
				var whiteFileName string
				fmt.Scanln(&whiteFileName)
				whiteListJoinIdoCmd.Run(cmd, []string{preRange, afterRange, mintContractAddress, abiFileName, joinIdoFuncName, joinIdoAmount, whiteFileName})

			default:
				fmt.Println("无效选择，请重新选择")
			}
		}
	},
}

var collectCmd = &cobra.Command{
	Use:   "collect",
	Short: "归拢功能",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) < 2 || args[0] == "" || args[1] == "" {
			log.Println("错误:: 钱包编号和金额请不要为空")
			return
		}
		pre, err := strconv.Atoi(args[0])
		after, err := strconv.Atoi(args[1])
		if err != nil || pre < 1 || pre > 2000 || after < pre || after < 1 || after > 2000 {
			log.Println("错误:: 钱包编号请为 1-2000的区间里,且前置范围不能大于后置范围")
			return
		}
		integrate.Integrate(MemoryCache, pre, after)
	},
}

var distributeFeesCmd = &cobra.Command{
	Use:   "distributeFees",
	Short: "分发手续费功能",
	Run: func(cmd *cobra.Command, args []string) {
		if args[0] == "" || args[1] == "" || args[2] == "" {
			log.Println("错误:: 钱包编号和金额请不要为空")
			return
		}
		pre, err := strconv.Atoi(args[0])
		after, err := strconv.Atoi(args[1])
		if err != nil || pre < 1 || pre > 2000 || after < pre || after < 1 || after > 2000 {
			log.Println("错误:: 钱包编号请为 1-2000的区间里,且前置范围不能大于后置范围")
			return
		}

		amountWei, err := util.ConvertEtherToWei(args[2])
		if err != nil {
			log.Println("错误:: 转换金额出错")
			return
		}

		batchTransfer.BatchTransfer(MemoryCache, pre, after, amountWei)

	},
}

var batchMintCmd = &cobra.Command{
	Use:   "batchMint",
	Short: "批量 mint 功能",
	Run: func(cmd *cobra.Command, args []string) {
		if args[0] == "" || args[1] == "" {
			log.Println("错误:: 钱包编号和金额请不要为空")
			return
		}
		if args[2] == "" || args[3] == "" {
			log.Println("错误:: 合约地址和abi文件名请不要为空")
			return
		}

		if args[4] == "" {
			args[4] = "mintNFT"
		}
		pre, err := strconv.Atoi(args[0])
		after, err := strconv.Atoi(args[1])
		if err != nil || pre < 1 || pre > 2000 || after < pre || after < 1 || after > 2000 {
			log.Println("错误:: 钱包编号请为 1-2000的区间里,且前置范围不能大于后置范围")
			return
		}
		if args[5] == "1" {
			// 采用白名单
			batchMint.WithWhiteListBatchMint(MemoryCache, pre, after, args[2], args[3], args[4])
		} else {
			batchMint.BatchMint(MemoryCache, pre, after, args[2], args[3], args[4])
		}
	},
}

var getWalletKeyCmd = &cobra.Command{
	Use:   "getWalletKey",
	Short: "查看钱包私钥",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) < 2 || args[0] == "" || args[1] == "" {
			log.Println("错误:: 钱包编号请不要为空")
			return
		}
		pre, err := strconv.Atoi(args[0])
		after, err := strconv.Atoi(args[1])
		if err != nil || pre < 1 || pre > 2000 || after < pre || after < 1 || after > 2000 {
			log.Println("错误:: 钱包编号请为 1-2000的区间里,且前置范围不能大于后置范围")
			return
		}
		getWalletPri.GetWalletPri(pre, after)
	},
}

var setMainWalletCmd = &cobra.Command{
	Use:   "setMainWallet",
	Short: "设置主钱包功能",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) < 1 || args[0] == "" {
			log.Println("错误:: 请提供私钥....")
			return
		}
		privateKeyHex := args[0]

		privateKey, err := crypto.HexToECDSA(privateKeyHex)
		if err != nil {
			log.Printf("主钱包私钥转换失败: %v", err)
			return
		}

		mainWallet = crypto.PubkeyToAddress(privateKey.PublicKey).Hex()

		MemoryCache.Set("privateKey", privateKeyHex, cache.NoExpiration)

		fmt.Println("✔ 主钱包地址设置成功:", mainWallet)
	},
}

var setNetNodeCmd = &cobra.Command{
	Use:   "setNetNode",
	Short: "设置网络节点功能",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) < 1 || args[0] == "" {
			log.Println("错误:: 请提供节点编号")
			return
		}

		nodeChoice, err := strconv.Atoi(args[0])
		if err != nil || nodeChoice < 0 {
			log.Println("错误:: 无效的节点编号")
			return
		}

		switch nodeChoice {
		case 0:
			netNode = "http://localhost:8545"
		case 1:
			netNode = "https://b2-mainnet.alt.technology"
		case 2:
			netNode = "https://b2-testnet.alt.technology"
		case 3:
			netNode = "https://rpc.zklink.io"
		case 4:
			netNode = "https://sepolia.rpc.zklink.io"
		default:
			log.Println("错误:: 无效的节点编号")
			return
		}

		MemoryCache.Set("netNode", netNode, cache.NoExpiration)
		fmt.Println("✔  网络节点设置成功:", netNode)
	},
}

var whiteListJoinIdoCmd = &cobra.Command{
	Use:   "whiteListJoinIdo",
	Short: "批量 joinIdo",
	Run: func(cmd *cobra.Command, args []string) {
		if args[0] == "" || args[1] == "" {
			log.Println("错误:: 钱包编号和金额请不要为空")
			return
		}
		if args[2] == "" || args[3] == "" {
			log.Println("错误:: 合约地址和abi文件名请不要为空")
			return
		}

		if args[4] == "" {
			args[4] = "joinIdo"
		}

		pre, err := strconv.Atoi(args[0])
		after, err := strconv.Atoi(args[1])
		if err != nil || pre < 1 || pre > 2000 || after < pre || after < 1 || after > 2000 {
			log.Println("错误:: 钱包编号请为 1-2000的区间里,且前置范围不能大于后置范围")
			return
		}
		if args[5] == "" {
			log.Println("错误:: 金额不能为空")
			return
		}
		amountWei, err := util.ConvertEtherToWei(args[5])
		if err != nil {
			log.Println("错误:: 转换金额出错")
			return
		}

		if args[6] == "1" {
			whiteListJoinIdo.ListJoinIdoWithWithWhiteList(MemoryCache, pre, after, args[2], args[3], args[4], amountWei)
		} else {
			whiteListJoinIdo.JoinIdoNoWhite(MemoryCache, pre, after, args[2], args[3], args[4], amountWei)
		}

	},
}

func main() {
	MemoryCache = cache.New(10*time.Minute, 10*time.Minute)
	MemoryCache.Set("netNode", "http://localhost:8545", cache.NoExpiration)
	rootCmd.AddCommand(collectCmd)
	rootCmd.AddCommand(distributeFeesCmd)
	rootCmd.AddCommand(batchMintCmd)
	rootCmd.AddCommand(setMainWalletCmd)
	rootCmd.AddCommand(getWalletKeyCmd)
	rootCmd.AddCommand(setNetNodeCmd)
	rootCmd.AddCommand(whiteListJoinIdoCmd)
	// 捕获 Ctrl+C 信号
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		fmt.Println("\nReceived exit signal, program is exiting.")
		os.Exit(0)
	}()

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
