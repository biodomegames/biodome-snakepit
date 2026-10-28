export var Config =
{
	projectName: "Snakepit",
	version: "0.5.0",
	build: 50,

	getVersionString: function()
	{
		return this.version + " b" + this.build
	},

	showCrashNoticeOnStartup: false,
	//<debug>
	// @ts-ignore
	showCrashNoticeOnStartup: true,
	//</debug>
	useMusic: true,
	//multiplayerServerProduction: 'wss://playseedling.com/ws',
	// multiplayerServerDevelopment: 'ws://localhost:2567',
	//multiplayerServerNetworkDevelopment: 'ws://192.168.2.178:2567', // this is the url that your dev machine is typically on. This is default tobias machine. Change to your own.

	// AdMob
	// admob ID is set in config.xml in the cordova config file

	useMockAdSystem: false,
	admobUseTestIds: true,

	//<debug>
	// @ts-ignore
	admobUseTestIds: true,
	//</debug>

	interstitialAfterEveryNthLevel: 3,

	IOS_test_admobInterstitialId: "ca-app-pub-3940256099942544/4411468910",
	IOS_test_admobRewardVideoId: "ca-app-pub-3940256099942544/1712485313",
	IOS_test_admobBannerId: "ca-app-pub-3940256099942544/2435281174",

	IOS_admobInterstitialId: "ca-app-pub-1912122760844192/6424508747",
	IOS_admobRewardVideoId: "ca-app-pub-1912122760844192/2381854781",
	IOS_admobBannerId: "ca-app-pub-1912122760844192/2628733963",

	// Google Analytics Measurement IDs
	// iOS uses Firebase Analytics SDK (configured via GoogleService-Info.plist) - doesn't use this
	// Web uses gtag.js and needs the web data stream Measurement ID
	googleAnalyticsId: "G9F0GT5C8N", // Web Measurement ID (without G- prefix, code adds it)

	OLDgoogleAnalyticsId: "493264470",
}


