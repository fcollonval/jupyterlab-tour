import * as React from 'react';

import { IDisposable } from '@lumino/disposable';

import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ReactWidget } from '@jupyterlab/apputils';
import { HTMLSelect } from '@jupyterlab/ui-components';
import { NotebookPanel, Notebook, INotebookModel } from '@jupyterlab/notebook';

import { INotebookTourManager } from './tokens';
import { notebookTourIcon, notebookHasTourIcon } from './icons';
import { TranslationBundle } from '@jupyterlab/translation';

/**
 * A notebook widget extension that adds a tour button to the toolbar.
 */
export class NotebookTourButton
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  constructor(options: NotebookTourButton.IOptions) {
    this._notebookTourManager = options.notebookTourManager;
  }
  /**
   * Create a new extension object.
   */
  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    const button = new TourButton(panel.content, this._notebookTourManager);
    panel.toolbar.insertItem(10, 'notebookTour', button);
    return button;
  }

  private _notebookTourManager: INotebookTourManager;
}

export namespace NotebookTourButton {
  export interface IOptions {
    notebookTourManager: INotebookTourManager;
  }
}

export class TourButton extends ReactWidget {
  /**
   * Construct a new notebook toolbar item for tours
   */
  constructor(notebook: Notebook, manager: INotebookTourManager) {
    super();
    this._manager = manager;
    this._notebook = notebook;
    this.addClass('jp-NotebookTour-toolbaritem');
    if (notebook.model) {
      this.update();
    }
    this._manager.notebookToursChanged.connect(this.update, this);
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._manager.notebookToursChanged.disconnect(this.update, this);
    super.dispose();
  }

  render(): JSX.Element {
    let title = this.translator.__('Start a Notebook Tour');
    const tourIds = this._manager.getNotebookTourIds(this._notebook);
    let icon = notebookTourIcon;
    if (tourIds.length) {
      title = `${title} (${tourIds.length})`;
      icon = notebookHasTourIcon;
    }

    return (
      <HTMLSelect
        onChange={this.handleChange}
        icon={icon}
        aria-label={this.translator.__('Notebook Tours')}
        title={title}
        value=""
      >
        <option value=""></option>
        {tourIds.length ? (
          <option value="ALL">{this.translator.__('Run all tours')}</option>
        ) : (
          []
        )}
        {tourIds.length ? (
          <optgroup label={this.translator.__('Notebook Tours')}>
            {tourIds.map(this.renderOption)}
          </optgroup>
        ) : (
          []
        )}
      </HTMLSelect>
    );
  }

  /**
   * Handle `change` events for the HTMLSelect component.
   */
  handleChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> => {
    const { value } = event.target;
    switch (value) {
      case '-':
        break;
      case 'ALL':
        await this._manager.tourManager.launch(
          this._manager.getNotebookTourIds(this._notebook),
          true
        );
        break;
      default:
        await this._manager.tourManager.launch([value], true);
        break;
    }
  };

  renderOption = (tourId: string): JSX.Element => {
    const tour = this._manager.tourManager.tours.get(tourId);
    return (
      <option key={tourId} value={tourId}>
        {tour?.label || tourId}
      </option>
    );
  };

  get translator(): TranslationBundle {
    return this._manager.tourManager.translator;
  }

  private _manager: INotebookTourManager;
  private _notebook: Notebook;
}
