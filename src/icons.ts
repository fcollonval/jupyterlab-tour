import { LabIcon } from '@jupyterlab/ui-components';

import { NS } from './tokens';
import SVG_PIN from '../style/img/pin.svg';
import SVG_PIN_USER from '../style/img/person-pin.svg';
import SVG_PIN_NOTEBOOK from '../style/img/notebook-pin.svg';

export const tourIcon = new LabIcon({ name: `${NS}:tour`, svgstr: SVG_PIN });
export const defaultTourIcon = new LabIcon({
  name: `${NS}:default-welcome-tour`,
  svgstr: SVG_PIN.replace(/jp-icon3/, 'jp-icon-warn0')
});
export const defaultNotebookTourIcon = new LabIcon({
  name: `${NS}:default-notebook-tour`,
  svgstr: SVG_PIN_NOTEBOOK.replace(/jp-icon3/, 'jp-icon-warn0')
});
export const userTourIcon = new LabIcon({
  name: `${NS}:user-tour`,
  svgstr: SVG_PIN_USER
});
export const notebookTourIcon = new LabIcon({
  name: `${NS}:notebook-tour`,
  svgstr: SVG_PIN_NOTEBOOK
});
export const notebookHasTourIcon = new LabIcon({
  name: `${NS}:notebook-has-tour`,
  svgstr: SVG_PIN_NOTEBOOK.replace(/jp-icon3/, 'jp-icon-brand0')
});
