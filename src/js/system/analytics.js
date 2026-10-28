


//<frvr>
import { AnalyticsFrvr } from "./analytics_frvr";
//@ts-ignore
export const Analytics = new AnalyticsFrvr();
//</frvr>

//<web,ios,google>
import { AnalyticsGoogle } from "./analytics_google";
//@ts-ignore
export const Analytics = new AnalyticsGoogle();
//</web,ios,google>