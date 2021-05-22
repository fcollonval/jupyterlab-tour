import { JSONExt } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  CallBackProps,
  Props as JoyrideProps,
  status,
  STATUS,
  Step,
  valueof
} from 'react-joyride';
import { TutorialDefaultOptions } from './constants';
import { ITourHandler, StepPlacement } from './tokens';
import { tourIcon } from './icons';

// TODO should be IDisposable !! handling signal connection clearance
export class TourHandler implements ITourHandler {
  constructor(
    id: string,
    label: string,
    options?: Omit<JoyrideProps, 'steps'>,
    icon: LabIcon | null = null
  ) {
    this._label = label;
    this._id = id;
    this._icon = icon || null;
    const { styles, ...others } = options ?? {};
    this._options = { ...TutorialDefaultOptions, ...others };
    if (!this._options.styles) {
      this._options.styles = {};
    }
    this._options.styles.options = {
      ...(this._options.styles.options || {}),
      ...(styles?.options || {})
    };
  }

  /**
   * The index of the current step of the tour. Returns -1 if tour isn't active.
   */
  get currentStepIndex(): number {
    return this._currentStepIndex;
  }

  /**
   * A signal emitted when all the steps of the tour have been seen and tour is finished.
   */
  get finished(): ISignal<this, CallBackProps> {
    return this._finished;
  }

  /**
   * True if the tour has steps, otherwise false. Launching a tour without steps is a no-op.
   */
  get hasSteps(): boolean {
    return this.steps.length > 0;
  }

  /**
   * The id of the tour, used by the tour manager to track different tours.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Whether the tour is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The tour label
   */
  get label(): string {
    return this._label;
  }

  /**
   * The tour icons
   */
  get icon(): LabIcon {
    return this._icon || tourIcon;
  }

  /**
   * Each tour can have it's behavior, attributes and css styling customized
   * by accessing and setting its options.
   */
  get options(): Omit<JoyrideProps, 'steps'> {
    return this._options;
  }

  set options(options: Omit<JoyrideProps, 'steps'>) {
    this._options = JSONExt.deepCopy(options as any) as any;
  }

  /**
   * A signal emitted if the user skips or ends the tour prematurely.
   */
  get skipped(): ISignal<this, CallBackProps> {
    return this._skipped;
  }

  /**
   * A signal emitted when the tour is first launched.
   */
  get started(): ISignal<this, CallBackProps> {
    return this._started;
  }

  /**
   * A signal emitted when the tour step has changed.
   */
  get stepChanged(): ISignal<this, CallBackProps> {
    return this._stepChanged;
  }

  /**
   * The array of steps the tour currently contains. Each step will be followed
   * in order as the tour progresses.
   */
  get steps(): Step[] {
    return this._steps;
  }

  set steps(steps: Step[]) {
    this._steps = steps;
  }

  /**
   * Adds a step to the tour.
   *
   * @param step Step - The step to add to the current tour.
   */
  addStep(step: Step): void {
    if (step) {
      this.steps.push(step);
    }
  }

  /**
   * Creates a tour step and adds it to this tour.
   *
   * @param target A css selector that will specify which area/component to highlight with this step.
   * @param content The text content to use for this tour step.
   * @param placement The position of the content when it is displayed for this step.
   * @param title The title to use for the the tour step.
   *
   * @returns The create step
   *
   * @deprecated Prefer using {@link addStep} passing the argument within an object.
   */
  createAndAddStep(
    target: string,
    content: React.ReactNode,
    placement?: StepPlacement,
    title?: string
  ): Step {
    const newStep: Step = {
      title,
      placement,
      target,
      content
    };
    this.addStep(newStep);
    return newStep;
  }

  /**
   * Dispose the tour.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Is the tour running?
   */
  isRunning(): boolean {
    return this._currentStepIndex >= 0;
  }

  /**
   * Handle react-joyride callbacks
   *
   * @param data Callback data
   */
  handleTourEvent = (data: CallBackProps): void => {
    if (!data) {
      return;
    }
    const { status, step, index } = data;

    // Handle status changes when they occur
    if (status !== this._previousStatus) {
      this._previousStatus = status;
      this._currentStepIndex = -1;
      if (status === STATUS.FINISHED) {
        this._finished.emit(data);
      } else if (status === STATUS.SKIPPED) {
        this._skipped.emit(data);
      } else if (status === STATUS.RUNNING) {
        this._currentStepIndex = 0;
        this._started.emit(data);
      } else if (status === STATUS.ERROR) {
        console.error(`An error occurred with the tour at step: ${step}`);
      }
    }

    // Emit step change event
    if (status === STATUS.RUNNING) {
      if (index !== this._previousStepIndex) {
        this._previousStepIndex = index;
        this._currentStepIndex = data.index;
      }
      this._stepChanged.emit(data);
    }
  };

  /**
   * This will replace the tour step at the specified index with a new step
   * @param index The index of the step to update.
   * @param newStep The new step that will replace the old step.
   */
  replaceStep(index: number, newStep: Step): void {
    if (index < 0 || index >= this.steps.length) {
      return;
    }
    const updatedSteps: Step[] = this._steps;
    updatedSteps[index] = newStep;
    this.steps = updatedSteps;
  }

  /**
   * Removes a step from the tour, no-op if the index is out of range.
   * @param index The index of the step to remove.
   */
  removeStep(index: number): Step | null {
    if (index < 0 || index >= this.steps.length) {
      return null;
    }
    return this.steps.splice(index, 1)[0];
  }

  private _skipped: Signal<this, CallBackProps> = new Signal<
    this,
    CallBackProps
  >(this);
  private _finished: Signal<this, CallBackProps> = new Signal<
    this,
    CallBackProps
  >(this);
  private _started: Signal<this, CallBackProps> = new Signal<
    this,
    CallBackProps
  >(this);
  private _stepChanged: Signal<this, CallBackProps> = new Signal<
    this,
    CallBackProps
  >(this);

  private _currentStepIndex = -1;
  private _id: string;
  private _isDisposed = false;
  private _label: string;
  private _options: Partial<JoyrideProps>;
  private _previousStatus: valueof<status> = STATUS.READY;
  private _previousStepIndex = -1;
  private _steps: Step[] = new Array<Step>();
  private _icon: LabIcon | null;
}
