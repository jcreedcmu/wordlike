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
    <div className="bug-report-modal" onContextMenu={absorb} onMouseDown={absorb}>Please file issues <a target="_blank" href="https://github.com/jcreedcmu/wordlike/issues/">on the github issues page</a>.<br />
      It might be helpful to <a href={URL.createObjectURL(blob)} download="debug.json">download this file</a> (which is a dump
      of the current game state) and attach it.<br />
      Thanks!
      <center>
        <button style={{ marginTop: '2em' }} onClick={dismiss}>Ok</button>
      </center>
    </div>
  </div>;
}
