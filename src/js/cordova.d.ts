interface Cordova {
    // Add any Cordova-specific methods you use
}

interface StatusBar {
    overlaysWebView(overlay: boolean): void;
    styleDefault(): void;
    styleLightContent(): void;
    styleBlackTranslucent(): void;
    styleBlackOpaque(): void;
    backgroundColorByName(color: string): void;
    backgroundColorByHexString(color: string): void;
    hide(): void;
    show(): void;
}

interface AndroidFullScreen {
    immersiveMode(successCallback?: () => void, errorCallback?: (error: any) => void): void;
    showSystemUI(successCallback?: () => void, errorCallback?: (error: any) => void): void;
    leanMode(successCallback?: () => void, errorCallback?: (error: any) => void): void;
    showUnderStatusBar(successCallback?: () => void, errorCallback?: (error: any) => void): void;
    showUnderSystemUI(successCallback?: () => void, errorCallback?: (error: any) => void): void;
    isImmersiveModeSupported(successCallback: (supported: boolean) => void, errorCallback?: (error: any) => void): void;
}

interface Window {
    cordova?: Cordova;
    StatusBar?: StatusBar;
    AndroidFullScreen?: AndroidFullScreen;
} 