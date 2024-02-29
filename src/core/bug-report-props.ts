import { Dispatch } from "./action";
import { BugReportData } from "./state-types";

export type BugReportProps = BugReportData & {
  dispatch: Dispatch;
};
