import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { TranslationBundle } from '@jupyterlab/translation';
import { Notebook } from '@jupyterlab/notebook';
import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import { LabIcon } from '@jupyterlab/ui-components';
import React from 'react';
import {
  CallBackProps,
  Placement,
  Props as JoyrideProps,
  Step
} from 'react-joyride';

/**
 * Namespace for everything
 */
export const NS = 'jupyterlab-tour';

/**
 * Core Extension ID
 */
export const PLUGIN_ID = `${NS}:plugin`;

/**
 * User-defined tours extension ID
 */
export const USER_PLUGIN_ID = `${NS}:user-tours`;

/**
 * Notebook-defined tours extension ID
 */
export const NOTEBOOK_PLUGIN_ID = `${NS}:notebook-tours`;

/**
 * First-party curated tours, like Notebook and Welcomes
 */
export const DEFAULTS_PLUGIN_ID = `${NS}:default-tours`;

/**
 * Token to get a reference to the tours manager
 */
export const ITourManager = new Token<ITourManager>(`${NS}:ITourManager`);

/**
 * Token to get a reference to the user tours manager
 */
export const IUserTourManager = new Token<IUserTourManager>(
  `${NS}:IUserTourManager`
);

/**
 * Token to get a reference to the notebook tours manager
 */
export const INotebookTourManager = new Token<INotebookTourManager>(
  `${NS}:IUserTourManager`
);

/**
 * Step placement, as it's mostly used here, can have a few extra values than
 * other uses.
 */
export type StepPlacement = Placement | 'center' | 'auto';

/**
 * Serialized step interface
 */
export interface IStep {
  /**
   * Step content
   */
  content: React.ReactNode;
  /**
   * CSS selector
   */
  target: string;
  /**
   * Pop-up position
   */
  placement?: StepPlacement;
  /**
   * Pop-up title
   */
  title?: string;
}

/**
 * Serialized tour interface
 */
export interface ITour {
  /**
   * Tour unique ID
   */
  id: string;
  /**
   * Tour label
   */
  label: string;
  /**
   * Should this tour be added as entry in the Help menu. User-added tours always are.
   */
  hasHelpEntry: boolean;
  /**
   * The `name` of a LabIcon to show next to this tour
   */
  icon?: string;
  /**
   * Tour steps
   */
  steps: Array<IStep>;
  /**
   * Tour options
   *
   * @see https://docs.react-joyride.com/props
   *
   * #### Notes
   *
   * All options are accepted except the steps entry.
   */
  options?: Omit<JoyrideProps, 'steps'>;
  /**
   * Translation domain for this tour
   */
  translation?: string;
}

/**
 * Tour handler interface
 */
export interface ITourHandler extends IDisposable {
  /**
   * Adds a step to the tour.
   *
   * @param step Step - The step to add to the current tour.
   */
  addStep(step: Step): void;

  /**
   * Creates a tour step and adds it to this tour.
   *
   * @param target A css selector that will specify which area/component to highlight with this step.
   * @param content The text content to use for this tour step.
   * @param placement The position of the content when it is displayed for this step.
   * @param title The title to use for the the tour step.
   *
   * @returns The create step
   */
  createAndAddStep(
    target: string,
    content: React.ReactNode,
    placement?: StepPlacement,
    title?: string
  ): Step;

  /**
   * The index of the current step of the tour. Returns -1 if tour isn't active.
   */
  readonly currentStepIndex: number;

  /**
   * Is the tour running?
   */
  isRunning(): boolean;

  /**
   * A signal emitted when all the steps of the tour have been seen and tour is finished.
   */
  readonly finished: ISignal<this, CallBackProps>;

  /**
   * True if the tour has steps, otherwise false. Launching a tour without steps is a no-op.
   */
  readonly hasSteps: boolean;

  /**
   * The tour id, used by the tour manager to track different tours.
   */
  readonly id: string;

  /**
   * The tour label
   */
  readonly label: string;

  /**
   * The tour icon
   */
  readonly icon: LabIcon | null;

  /**
   * Each tour can have it's behavior, attributes and css styling customized
   * by accessing and setting its options.
   */
  options: Omit<JoyrideProps, 'steps'>;

  /**
   * This will replace the tour step at the specified index with a new step
   * @param index The index of the step to update.
   * @param newStep The new step that will replace the old step.
   */
  replaceStep(index: number, newStep: Step): void;

  /**
   * Removes a step from the tour, no-op if the index is out of range.
   * @param index The index of the step to remove.
   */
  removeStep(index: number): Step | null;

  /**
   * A signal emitted if the user skips or ends the tour prematurely.
   */
  readonly skipped: ISignal<this, CallBackProps>;

  /**
   * A signal emitted when the tour is first launched.
   */
  readonly started: ISignal<this, CallBackProps>;

  /**
   * A signal emitted when the tour step has changed.
   */
  readonly stepChanged: ISignal<this, CallBackProps>;

  /**
   * The array of steps the tour currently contains. Each step will be followed
   * in order as the tour progresses.
   */
  steps: Step[];
}

/**
 * Tours manager interface
 */
export interface ITourManager extends IDisposable {
  /**
   * The currently active tour. undefined if no tour is currently running.
   */
  readonly activeTour: ITourHandler | undefined;

  /**
   * Extension translation bundle
   */
  readonly translator: TranslationBundle;

  /**
   * Creates an interactive TourHandler object that can be customized and run by the TourManager.
   * @param tour The tour to be created.
   *
   * @returns The tour created or null in case of errors
   */
  addTour(tour: ITour): ITourHandler | null;

  /**
   * Creates an interactive TourHandler object that can be customized and run by the TourManager.
   * @param id The id used to track the tour.
   * @param label The label to use for the tour. If added to help menu, this would be the button text.
   * @param addToHelpMenu If true, the tour will be added as a button on the help menu. Default = True.
   * @param options Tour options
   * @param icon An optional icon to display in the Help Menu and Command Palette
   *
   * @returns The tour created
   */
  createTour(
    id: string,
    label: string,
    addToHelpMenu?: boolean,
    options?: Omit<JoyrideProps, 'steps'>,
    icon?: LabIcon
  ): ITourHandler;

  /**
   * Launches a tour or series of tours one after another in order of the array provided.
   * If the array is empty or no tours have steps, this will be a no-op.
   *
   * @param tours An array of tours or tutorialIDs to launch.
   * @param force Force the tour execution
   */
  launch(tours: ITourHandler[] | string[], force: boolean): Promise<void>;

  /**
   * Removes the tour and its associated command from the application.
   *
   * @param tour The TourHandler object or the id of the tour object to remove
   */
  removeTour(tour: string | ITourHandler): void;

  /**
   * Return a copy of
   *
   * @param tours an unordered list of tours
   * @returns an ordered list of tours
   */
  sortTours(tours: ITour[]): ITour[];

  /**
   * A key/value map of the tours that the tour manager contains.
   * Key: ID of the tour, value: tour object.
   */
  readonly tours: Map<string, ITourHandler>;
}

/**
 * User Tours manager interface
 */
export interface IUserTourManager {
  /**
   * Promise resolved when the user tour manager is ready.
   */
  readonly ready: Promise<void>;
  /**
   * Tour manager
   */
  readonly tourManager: ITourManager;
}

/**
 * Namespace for user tour interfaces
 */
export namespace IUserTourManager {
  /**
   * UserTourManager constructor options
   */
  export interface IOptions {
    /**
     * Tour manager
     */
    tourManager: ITourManager;
    /**
     * Extension settings getter
     */
    getSettings: () => Promise<ISettingRegistry.ISettings>;
  }
}

/**
 * Notebook Tours manager interface
 */
export interface INotebookTourManager {
  /**
   * Tour manager
   */
  readonly tourManager: ITourManager;
  /**
   * The current notebook
   */
  addNotebook(notebook: Notebook): Promise<void>;

  /**
   * Get the list of full tour ids for this notebook
   *
   * @param panel the notebook
   * @returns
   */
  getNotebookTourIds(motebook: Notebook): string[];

  /**
   * A signal that emits when a particular notebooks tours change
   */
  notebookToursChanged: ISignal<INotebookTourManager, Notebook>;
}

/**
 * Namespace for notebook tour interfaces
 */
export namespace INotebookTourManager {
  /**
   * NotebookTourManager constructor options
   */
  export interface IOptions {
    /**
     * Tour manager
     */
    tourManager: ITourManager;
  }
}
