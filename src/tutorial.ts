import { ISignal, Signal } from '@lumino/signaling';
import { Menu } from '@lumino/widgets';
import { ITutorial, StyleOptions, TutorialOptions } from 'jupyterlab-tutorial';
import {
  CallBackProps,
  Placement,
  Props as JoyrideProps,
  status,
  STATUS,
  Step,
  Styles,
  valueof
} from 'react-joyride';
import { CommandIDs, TutorialDefaultOptions } from './constants';

export class Tutorial implements ITutorial {
  constructor(id: string, label: string, options?: Partial<JoyrideProps>) {
    this._label = label;
    this._id = id;
    const { styles, ...others } = options || { styles: {} };
    this._options = { ...TutorialDefaultOptions, ...others };
    Object.keys(styles).forEach(k => {
      const key = k as keyof Styles;
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      this._options.styles[key] = {
        ...this._options.styles[key],
        ...styles[key]
      };
    });
  }

  get commandID(): string {
    return CommandIDs.launch;
  }

  get currentStepIndex(): number {
    return this._currentStepIndex;
  }

  get finished(): ISignal<this, CallBackProps> {
    return this._finished;
  }

  get hasSteps(): boolean {
    return this.steps.length > 0;
  }

  get id(): string {
    return this._id;
  }

  get label(): string {
    return this._label;
  }

  get options(): TutorialOptions {
    const { styles, ...others } = this._options;
    const options = others as TutorialOptions;
    options.styles = { ...styles.options } as StyleOptions;
    return options;
  }

  set options(options: TutorialOptions) {
    const { styles, ...others } = options;
    this._options = { ...this._options, ...others };
    this._options.styles.options = {
      ...this._options.styles.options,
      ...styles
    };
  }

  get optionsJoyride(): Partial<JoyrideProps> {
    return this._options;
  }

  get skipped(): ISignal<this, CallBackProps> {
    return this._skipped;
  }

  get started(): ISignal<this, CallBackProps> {
    return this._started;
  }

  get stepChanged(): ISignal<this, CallBackProps> {
    return this._stepChanged;
  }

  get steps(): Step[] {
    return this._steps;
  }

  set steps(steps: Step[]) {
    this._steps = steps;
  }

  addStep(step: Step): void {
    if (step) {
      this.steps.push(step);
    }
  }

  addTutorialToMenu(menu: Menu): Menu.IItem {
    const btnOptions: Menu.IItemOptions = {
      args: {
        id: this._id
      },
      command: this.commandID
    };

    const menuButton: Menu.IItem = menu.addItem(btnOptions);
    this._menuButtons.push(menuButton);
    return menuButton;
  }

  isRunning(): boolean {
    return this._currentStepIndex >= 0;
  }

  removeTutorialFromMenu(menu: Menu): Menu.IItem[] {
    if (
      !menu ||
      !menu.items ||
      menu.items.length <= 0 ||
      this._menuButtons.length <= 0
    ) {
      return; // No-op if menu or buttons list are empty
    }

    const menuItems: Set<Menu.IItem> = new Set(menu.items);
    const tutorialItems: Set<Menu.IItem> = new Set(this._menuButtons);
    const intersection: Set<Menu.IItem> = new Set(
      [...menuItems].filter(item => tutorialItems.has(item))
    );
    const itemsToRemove: Menu.IItem[] = Array.from(intersection);
    itemsToRemove.forEach((item: Menu.IItem, idx: number) => {
      menu.removeItem(item);
      this._menuButtons.splice(idx, 1);
    });
    return itemsToRemove;
  }

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
        console.error(`An error occurred with the tutorial at step: ${step}`);
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

  createAndAddStep(
    target: string,
    content: string,
    placement?: Placement,
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

  replaceStep(index: number, newStep: Step): void {
    if (index < 0 || index >= this.steps.length) {
      return;
    }
    const updatedSteps: Step[] = this._steps;
    updatedSteps[index] = newStep;
    this.steps = updatedSteps;
  }

  removeStep(index: number): Step {
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
  private _label: string;
  private _menuButtons: Menu.IItem[] = new Array<Menu.IItem>();
  private _options: Partial<JoyrideProps>;
  private _previousStatus: valueof<status> = STATUS.READY;
  private _previousStepIndex = -1;
  private _steps: Step[] = new Array<Step>();
}
