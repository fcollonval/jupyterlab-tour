import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  INotebookTracker,
  Notebook,
  NotebookModel
} from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { StateDB } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';
import { ReadonlyJSONObject } from '@lumino/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CodeMirrorMimeTypeService } from '@jupyterlab/codemirror';
import { Signal } from '@lumino/signaling';
import 'jest';
import { CommandIDs } from '../constants';
import plugin from '../index';
import {
  INotebookTourManager,
  ITour,
  ITourManager,
  IUserTourManager,
  NS
} from '../tokens';

const DEFAULT_TOURS_SIZE = 2;

const [corePlugin, userPlugin, notebookPlugin, defaultsPlugin] = plugin;

function mockApp(): Partial<JupyterFrontEnd> {
  return {
    commands: new CommandRegistry(),
    restored: Promise.resolve(),
    docRegistry: new DocumentRegistry()
  };
}

function aTour(): ITour {
  return {
    id: 'test-jupyterlab-tour:welcome',
    label: 'Welcome Tour',
    hasHelpEntry: true,
    steps: [
      {
        content: 'Tours of Jupyter',
        placement: 'auto',
        target: '#jp-MainLogo',
        title: 'Jupyter'
      },
      {
        content:
          'The following tour will point out some of the main UI components within JupyterLab.',
        placement: 'right',
        target: '#jp-main-dock-panel',
        title: 'Welcome to Jupyter Lab!'
      },
      {
        content:
          'This is the main content area where notebooks and other content can be viewed and edited.',
        placement: 'center',
        target: '#jp-main-dock-panel',
        title: 'Main Content'
      }
    ]
  };
}

function mockSettingRegistry(): ISettingRegistry {
  const settings: ISettingRegistry.ISettings = {
    composite: { tours: [(aTour() as any) as ReadonlyJSONObject] }
  } as any;
  (settings as any)['changed'] = new Signal<any, any>(settings);

  return {
    load: async (): Promise<any> => settings as any
  } as any;
}

function mockNbTracker(): Partial<INotebookTracker> {
  const nbTracker: Partial<INotebookTracker> = {};
  (nbTracker as any).widgetAdded = new Signal<any, any>(nbTracker);
  return nbTracker;
}

describe(corePlugin.id, () => {
  describe('activation', () => {
    it('should create add-tour command', () => {
      const app = mockApp();
      const stateDB = new StateDB();
      corePlugin.activate(app as any, stateDB);

      expect(app.commands?.hasCommand(CommandIDs.addTour)).toEqual(true);
    });
  });

  describe('commands', () => {
    describe(`${CommandIDs.addTour}`, () => {
      it('should add a tour command', async () => {
        const app = mockApp();
        const stateDB = new StateDB();
        const manager = corePlugin.activate(
          app as any,
          stateDB
        ) as ITourManager;
        expect(manager.tours.size).toEqual(0);

        const tour = await app.commands?.execute(CommandIDs.addTour, {
          tour: (aTour() as any) as ReadonlyJSONObject
        });

        expect(manager.tours.size).toEqual(1);
        expect(tour).toBeTruthy();
        expect(manager.tours.get(tour.id)).toBeTruthy();
      });
    });
  });
});

describe(userPlugin.id, () => {
  describe('activation', () => {
    it('should have userTours', async () => {
      const app = mockApp();
      const stateDB = new StateDB();
      const manager = corePlugin.activate(app as any, stateDB) as ITourManager;
      const settings = mockSettingRegistry();
      const userManager = userPlugin.activate(
        app as any,
        settings,
        manager
      ) as IUserTourManager;
      await userManager.ready;
      expect(userManager.tourManager.tours.size).toBe(1);
    });
  });

  describe('settings', () => {
    it('should react to settings', async () => {
      const app = mockApp();
      const stateDB = new StateDB();
      const manager = corePlugin.activate(app as any, stateDB) as ITourManager;
      const settingsRegistry = mockSettingRegistry();
      const userManager = userPlugin.activate(
        app as any,
        settingsRegistry,
        manager
      ) as IUserTourManager;
      await userManager.ready;
      const settings = await settingsRegistry.load('whatever');
      (settings as any).composite = { tours: [] };
      (settings as any).changed.emit(void 0);
      expect(userManager.tourManager.tours.size).toBe(0);
    });
  });
});

describe(notebookPlugin.id, () => {
  describe('activation', () => {
    it('should activate', async () => {
      const app = mockApp();
      const stateDB = new StateDB();
      const manager = corePlugin.activate(app as any, stateDB) as ITourManager;
      const nbTracker = mockNbTracker();
      const notebookTourManager = notebookPlugin.activate(
        app as any,
        nbTracker,
        manager
      ) as INotebookTourManager;
      const notebook = new Notebook({
        rendermime: null as any,
        mimeTypeService: new CodeMirrorMimeTypeService()
      });
      const model = new NotebookModel();
      notebook.model = model;
      notebookTourManager.addNotebook(notebook);
      expect(notebookTourManager.tourManager.tours.size).toBe(0);
      model.metadata.set(NS, {
        tours: [(aTour() as unknown) as ReadonlyJSONObject]
      });
      expect(notebookTourManager.tourManager.tours.size).toBe(1);
      model.metadata.delete(NS);
      expect(notebookTourManager.tourManager.tours.size).toBe(0);
    });
  });
});

describe(defaultsPlugin.id, () => {
  describe('activation', () => {
    it('should activate', () => {
      const app = mockApp();
      const stateDB = new StateDB();
      const manager = corePlugin.activate(app as any, stateDB) as ITourManager;
      defaultsPlugin.activate(app as any, manager);
      expect(manager.tours.size).toEqual(DEFAULT_TOURS_SIZE);
    });
  });
});
