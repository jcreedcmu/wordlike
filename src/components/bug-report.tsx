import * as React from 'react';
import { BugReportProps } from "../core/bug-report-props";

export function BugReport(props: BugReportProps): JSX.Element {
  const { data, dispatch } = props;
  const blob = new Blob([data], { type: 'application/octet-stream' });

  const onclick: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'cancelModals' });
  };

  return <div className="bug-report-container">
    <div className="bug-report-modal">Thanks for making a bug report!<br />
      Please <a href={URL.createObjectURL(blob)} download="debug.json">download this file</a> and attach it.
      <br /><br />
      <center>
        <button onClick={onclick}>Ok</button>
      </center>
    </div>
  </div>;
}
