import * as React from 'react';
import { Dispatch } from "../core/action";

export type SettingsProps = { dispatch: Dispatch };

export function Settings(props: SettingsProps): JSX.Element {
  const { dispatch } = props;


  const dismiss: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'cancelModals' });
  };

  const absorb: React.MouseEventHandler = (e) => {
    e.stopPropagation();
  };

  return <div className="bug-report-container" onMouseDown={dismiss}>
    <div className="bug-report-modal" onContextMenu={absorb} onMouseDown={absorb}>

      Test
      <center>
        <button style={{ marginTop: '2em' }} onClick={dismiss}>Ok</button>
      </center>
    </div>
  </div>;
}
