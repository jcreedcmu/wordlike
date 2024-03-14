import * as React from 'react';
import { Dispatch } from "../core/action";
import { SettingsState } from "../core/settings-types";

export type SettingsProps = { dispatch: Dispatch, settings: SettingsState };

export function Settings(props: SettingsProps): JSX.Element {
  const { dispatch } = props;


  const success: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'multiple', actions: [{ t: 'cancelModals' }] });
  };

  const dismiss: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'cancelModals' });
  };

  const absorb: React.MouseEventHandler = (e) => {
    e.stopPropagation();
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    dispatch({ t: 'setAudioVolume', volume: parseFloat(e.target.value) / 100 });
  };

  return <div className="bug-report-container" onMouseDown={dismiss}>
    <div className="bug-report-modal" onContextMenu={absorb} onMouseDown={absorb}>

      <label htmlFor="audio_volume">Audio Volume:</label>
      <input type="range" id="audio_volume" min="0" max="100" value={Math.floor(100 * props.settings.audioVolume)}
        onChange={onChange} />

      <center>
        <button style={{ marginTop: '2em' }} onClick={success}>Ok</button>
      </center>
    </div>
  </div>;
}
