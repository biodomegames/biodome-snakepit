import { AdManagerAdMob } from "./admanager_admob.js";
import { AdManagerFRVR } from "./admanager_frvr.js";
//<debug>
import { Config } from "../config.js";
import { installDebugAdStandIn } from "./debugadstandin.js";
//</debug>

// Build scripts normally enable exactly one block. Default: web AdMob.
//<web,ios,google>
export const adManager = new AdManagerAdMob()
//</web,ios,google>
//<frvr>
export const adManager = new AdManagerFRVR()
//</frvr>

//<debug>
// Debug builds: show a "INTERSTITIAL" / "REWARDED AD" dialog instead of calling the ad SDK.
if (Config.debugAdStandIn) installDebugAdStandIn(adManager)
//</debug>
