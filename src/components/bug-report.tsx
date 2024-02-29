import * as React from 'react';
import { BugReportProps } from "../core/bug-report-props";

export function BugReport(props: BugReportProps): JSX.Element {
  var blob = new Blob([props.data], { type: 'application/octet-stream' });

  return <div className="bug-report-container">
    <div className="bug-report-modal">Thanks for making a bug report!<br />
      Please <a href={URL.createObjectURL(blob)} download="debug.json">download this file</a> and attach it.</div>
  </div>;
}
