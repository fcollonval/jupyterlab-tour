import { ISignal, Signal } from '@lumino/signaling';
import { Menu } from '@lumino/widgets';

import { MainMenu } from '@jupyterlab/mainmenu';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { LabIcon } from '@jupyterlab/ui-components';

import { INotification } from 'jupyterlab_toastify';

import { Locale, Props as JoyrideProps } from 'react-joyride';

import { CommandIDs } from './constants';
import { ITour, ITourHandler, ITourManager, NS } from './tokens';
import { TourHandler } from './tour';
import { version } from './version';

const STATE_ID = `${NS}:state`;

/**
 * Manager state saved in the state database
 */
interface IManagerState {
  /**
   * Set of seen tour IDs
   */
  toursDone: Set<string>;
  /**
   * Tour extension version
   */
  version: string;
}

/**
 * The TourManager is needed to manage creation, removal and launching of Tutorials
 */
export class TourManager implements ITourManager {
  constructor(stateDB: IStateDB, translator: ITranslator, mainMenu?: MainMenu) {
    this._stateDB = stateDB;
    this._menu = mainMenu;
    this._tours = new Map<string, TourHandler>();
    this._trans = translator.load('jupyterlab-tour');
    this._translator = translator;

    this._locale = {
      back: this._trans.__('Back'),
      close: this._trans.__('Close'),
      last: this._trans.__('Done'),
      next: this._trans.__('Next'),
      open: this._trans.__('Open'),
      skip: this._trans.__('Skip')
    };

    this._stateDB.fetch(STATE_ID).then(value => {
      if (value) {
        const savedState = (value as any) as IManagerState;
        if (savedState.version !== version) {
          this._state.toursDone = new Set<string>();
          this._stateDB.save(STATE_ID, {
            version,
            toursDone: []
          });
        } else {
          this._state.toursDone = new Set<string>([...savedState.toursDone]);
        }
      }
    });
  }

  /**
   * The currently active tour. undefined if no tour is currently running.
   */
  get activeTour(): ITourHandler | undefined {
    const activeTour = this._activeTours.filter(tour => tour.isRunning());
    return activeTour[0];
  }

  /**
   * Whether the tour manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Signal emit with the launched tour
   */
  get tourLaunched(): ISignal<ITourManager, TourHandler[]> {
    return this._tourLaunched;
  }

  /**
   * A key/value map of the tours that the tour manager contains.
   * Key: ID of the tour, value: tour object.
   */
  get tours(): Map<string, ITourHandler> {
    return this._tours;
  }

  /**
   * Extension translation bundle
   */
  get translator(): TranslationBundle {
    return this._trans;
  }

  /**
   * Creates an interactive TourHandler object that can be customized and run by the TourManager.
   * @param tour The tour to be created.
   *
   * @returns The tour created
   *
   * #### Notes
   * Tour title and steps content will go through a translation bundle if they are strings.
   */
  addTour(tour: ITour): ITourHandler | null {
    try {
      let trans = this._trans;
      if (tour.translation) {
        trans = this._translator.load(tour.translation);
      }

      const handler = this.createTour(
        tour.id,
        trans.__(tour.label),
        tour.hasHelpEntry === false ? false : true,
        tour.options,
        tour.icon ? LabIcon.resolve({ icon: tour.icon }) : null
      );

      tour.steps.forEach(step => {
        const translatedStep = { ...step };
        if (typeof translatedStep.title === 'string') {
          translatedStep.title = trans.__(translatedStep.title);
        }
        if (typeof translatedStep.content === 'string') {
          translatedStep.content = trans.__(translatedStep.content);
        }
        handler.addStep(translatedStep);
      });

      return handler;
    } catch (error) {
      console.error(
        this._trans.__("Fail to add tour '%1' (%2)", tour.label, tour.id),
        error
      );
      return null;
    }
  }

  /**
   * Creates an interactive TourHandler object that can be customized and run by the TourManager.
   * @param id The id used to track the tour.
   * @param label The label to use for the tour. If added to help menu, this would be the button text.
   * @param addToHelpMenu If true, the tour will be added as a button on the help menu. Default = True.
   * @param options Tour options
   *
   * @returns The tour created
   *
   * #### Notes
   * The tour label will not be translated.
   */
  createTour = (
    id: string,
    label: string,
    addToHelpMenu = true,
    options: Omit<JoyrideProps, 'steps'> = {},
    icon: LabIcon | null = null
  ): ITourHandler => {
    if (this._tours.has(id)) {
      throw new Error(
        this._trans.__(
          "Error creating new tour. TourHandler id's must be unique.\nTutorial with the id: '%1' already exists.",
          id
        )
      );
    }

    // Set translation for common buttons.
    if (!options.locale) {
      options.locale = this._locale;
    }

    // Create tour and add it to help menu if needed
    const newTutorial: TourHandler = new TourHandler(id, label, options, icon);
    if (this._menu && addToHelpMenu) {
      const menuItem = this._menu.helpMenu.menu.addItem({
        args: {
          id: newTutorial.id
        },
        command: CommandIDs.launch
      });
      this._menuItems.set(newTutorial.id, menuItem);
    }

    // Add tour to current set
    this._tours.set(id, newTutorial);

    const done = (tour: TourHandler): void => {
      this._rememberDoneTour(tour.id);
    };
    newTutorial.skipped.connect(done);
    newTutorial.finished.connect(done);

    return newTutorial;
  };

  /**
   * Dispose the tour manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Launches a tour or series of tours one after another in order of the array provided.
   * If the array is empty or no tours have steps, this will be a no-op.
   *
   * @param tours An array of tours or tutorialIDs to launch.
   * @param force Force the tour execution
   */
  launch(tours: ITourHandler[] | string[], force = true): Promise<void> {
    if (!tours || tours.length === 0 || this.activeTour) {
      return Promise.resolve();
    }
    let tourGroup: Array<ITourHandler | undefined>;

    if (typeof tours[0] === 'string') {
      tourGroup = (tours as string[]).map((id: string) => this._tours.get(id));
    } else {
      tourGroup = tours as ITourHandler[];
    }

    let tourList = tourGroup.filter(
      (tour: ITourHandler | undefined) => tour && tour.hasSteps
    ) as TourHandler[];

    if (!force) {
      tourList = tourList.filter(tour => !this._state.toursDone.has(tour.id));
    }

    const startTours = (): void => {
      this._activeTours = tourList;
      this._tourLaunched.emit(tourList);
    };

    if (tourList.length > 0) {
      if (force) {
        startTours();
      } else {
        INotification.info(this._trans.__('Try the %1.', tourList[0].label), {
          autoClose: 10000,
          buttons: [
            {
              label: this._trans.__('Start now'),
              callback: startTours
            },
            {
              label: this._trans.__("Don't show me again"),
              callback: (): void => {
                tourList.forEach(tour => this._rememberDoneTour(tour.id));
              }
            }
          ]
        });
      }
    }

    return Promise.resolve();
  }

  /**
   * Removes the tour and its associated command from the application.
   *
   * @param tour The TourHandler object or the id of the tour object to remove
   */
  removeTour(t: string | ITourHandler): void {
    if (!t) {
      return;
    }

    let id: string;
    if (typeof t === 'string') {
      id = t;
    } else {
      id = t.id;
    }

    const tour: TourHandler | undefined = this._tours.get(id);
    if (!tour) {
      return;
    }
    // Remove tour from menu
    if (this._menu && this._menuItems.has(id)) {
      const item = this._menuItems.get(id);
      if (item) {
        this._menu.helpMenu.menu.removeItem(item);
      }
      this._menuItems.delete(id);
    }
    tour.dispose();
    // Remove tour from the list
    this._tours.delete(id);
    this._forgetDoneTour(id);
  }

  /**
   * Order a list of tours by label, if possible, falling back to unique id
   */
  sortTours(tours: ITour[]): ITour[] {
    const sortedTours = [...tours];
    sortedTours.sort(this._compareTours);
    return sortedTours;
  }

  private _forgetDoneTour = (id: string): void => {
    this._state.toursDone.delete(id);
    this._stateDB.save(STATE_ID, {
      toursDone: [...this._state.toursDone],
      version
    });
  };

  private _rememberDoneTour = (id: string): void => {
    this._state.toursDone.add(id);
    this._stateDB.save(STATE_ID, {
      toursDone: [...this._state.toursDone],
      version
    });
  };

  /**
   * Helper to sort user tours by label, if possible, falling back to unique id
   */
  private _compareTours(a: ITour, b: ITour): number {
    let transA = this.translator;
    if (a.translation) {
      transA = this._translator.load(a.translation);
    }
    let transB = this.translator;
    if (b.translation) {
      transB = this._translator.load(b.translation);
    }
    return (
      transA
        .__(a.label)
        .toLocaleLowerCase()
        .localeCompare(transB.__(b.label).toLocaleLowerCase()) ||
      a.id.localeCompare(b.id)
    );
  }

  private _activeTours: TourHandler[] = new Array<TourHandler>();
  private _isDisposed = false;
  private _locale: Locale;
  private _menu: MainMenu | undefined;
  private _menuItems: Map<string, Menu.IItem> = new Map();
  private _state: IManagerState = {
    toursDone: new Set<string>(),
    version
  };
  private _stateDB: IStateDB;
  private _trans: TranslationBundle;
  private _translator: ITranslator;
  private _tours: Map<string, TourHandler>;
  private _tourLaunched: Signal<ITourManager, TourHandler[]> = new Signal<
    ITourManager,
    TourHandler[]
  >(this);
}
