import Ajv from 'ajv';

import { Signal, ISignal } from '@lumino/signaling';
import { Notebook } from '@jupyterlab/notebook';
import {
  NS,
  ITour,
  ITourManager,
  INotebookTourManager,
  NOTEBOOK_PLUGIN_ID
} from './tokens';
import { notebookTourIcon } from './icons';
import USER_SCHEMA from '../schema/user-tours.json';

/**
 * The NotebookTourManager is needed to sync Notebook metadata with the TourManager
 */
export class NotebookTourManager implements INotebookTourManager {
  constructor(options: INotebookTourManager.IOptions) {
    this._tourManager = options.tourManager;
    this._validator = new Ajv().compile(USER_SCHEMA);
  }

  get tourManager(): ITourManager {
    return this._tourManager;
  }

  /**
   * Handle the current notebook changing
   */
  async addNotebook(notebook: Notebook): Promise<void> {
    if (this._notebookTours.has(notebook)) {
      return;
    }

    if (!notebook.model) {
      return;
    }

    notebook.model.metadata.changed.connect(() => {
      this._notebookMetadataChanged(notebook);
    });

    notebook.disposed.connect(this._onNotebookDisposed, this);

    this._notebookMetadataChanged(notebook);
  }

  /**
   * Get the list of full tour ids for this notebook
   *
   * @param notebook the notebook
   */
  getNotebookTourIds(notebook: Notebook): string[] {
    const tourIds: string[] = [];

    for (const id of this._tourManager.tours.keys()) {
      if (id.startsWith(`${NOTEBOOK_PLUGIN_ID}:${notebook.id}:`)) {
        tourIds.push(id);
      }
    }
    return tourIds;
  }

  /**
   * Get the validation errors for a notebook
   * @param notebook the notebook
   * @returns the list of errors
   */
  getNotebookValidationErrors(notebook: Notebook): Ajv.ErrorObject[] {
    return this._validationErrors.get(notebook) || [];
  }

  get notebookToursChanged(): ISignal<INotebookTourManager, Notebook> {
    return this._notebookToursChanged;
  }

  private _onNotebookDisposed(notebook: Notebook): void {
    this._cleanNotebookTours(notebook);
  }

  private _cleanNotebookTours(panel: Notebook): void {
    for (const id of this.getNotebookTourIds(panel)) {
      this._tourManager.removeTour(id);
    }
  }

  /**
   * The metadata changed, and therefor maybe tours: remove and re-add all of them.
   */
  private _notebookMetadataChanged(notebook: Notebook): void {
    const metadata = notebook.model?.metadata.get(NS);
    const trans = this._tourManager.translator;

    this._cleanNotebookTours(notebook);
    this._validationErrors.set(notebook, []);

    if (metadata) {
      this._validator(metadata);
      const errors = this._validator.errors || [];
      this._validationErrors.set(notebook, errors);
      if (errors.length) {
        console.error(
          trans.__('Validation errors found: fix them in Advanced Settings')
        );
        console.table(errors);
      } else {
        const tours: ITour[] =
          (notebook.model?.metadata.get(NS) as any)['tours'] || [];
        for (const tour of this.tourManager.sortTours(tours)) {
          try {
            this._addNotebookTour(notebook, tour);
            this._tourManager.launch([tour.id], false);
          } catch (error) {
            console.groupCollapsed(
              trans.__(
                'Error encountered adding notebook tour %1 (%2)',
                tour.label,
                tour.id
              ),
              error
            );
            console.table(tour.steps);
            console.log(tour.options || {});
            console.groupEnd();
          }
        }
      }
    }

    this._notebookToursChanged.emit(notebook);
  }

  /**
   * Actually create a tour from JSON
   */
  private _addNotebookTour(notebook: Notebook, tour: ITour): void {
    this._tourManager.addTour({
      ...tour,
      id: `${NOTEBOOK_PLUGIN_ID}:${notebook.id}:${tour.id}`,
      icon: tour.icon || notebookTourIcon.name
    });
  }

  private _tourManager: ITourManager;
  private _notebookTours = new Map<Notebook, ITour[]>();
  private _notebookToursChanged = new Signal<INotebookTourManager, Notebook>(
    this
  );
  private _validator: Ajv.ValidateFunction;
  private _validationErrors = new Map<Notebook, Ajv.ErrorObject[]>();
}
