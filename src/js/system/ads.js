import { AdManagerAdMob } from "./admanager_admob.js";
import { AdManagerFRVR } from "./admanager_frvr.js";

// Build scripts normally enable exactly one block. Default: web AdMob.
//<web,ios,google>
export const adManager = new AdManagerAdMob()
//</web,ios,google>
//<frvr>
export const adManager = new AdManagerFRVR()
//</frvr>