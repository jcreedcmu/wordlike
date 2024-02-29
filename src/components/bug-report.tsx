import * as React from 'react';
import { BugReportProps } from "../core/bug-report-props";

export function BugReport(props: BugReportProps): JSX.Element {
  const { data, dispatch } = props;
  const blob = new Blob([data], { type: 'application/octet-stream' });

  const dismiss: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'cancelModals' });
  };

  const absorb: React.MouseEventHandler = (e) => {
    e.stopPropagation();
  };

  return <div className="bug-report-container" onMouseDown={dismiss}>
    <div className="bug-report-modal" onMouseDown={absorb}>Thanks for making a bug report!<br />
      Please <a href={URL.createObjectURL(blob)} download="debug.json">download this file</a> and attach it.
      <center>
        <button style={{ marginTop: '2em' }} onClick={dismiss}>Ok</button>
      </center>
    </div>
  </div>;
}
