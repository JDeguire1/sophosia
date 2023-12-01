import { defineStore } from "pinia";
import { Dark } from "quasar";
import { updateAppState, getAppState } from "src/backend/appState";
import { AppState, Page, Settings, SpecialFolder } from "src/backend/database";
import { useProjectStore } from "./projectStore";
import darkContent from "src/css/vditor/dark.css?raw";
import lightContent from "src/css/vditor/light.css?raw";

export const useStateStore = defineStore("stateStore", {
  state: () => ({
    ready: false,

    // layout
    ribbonToggledBtnUid: "",
    leftMenuSize: 20,
    showLeftMenu: false,
    showPDFMenuView: false,
    libraryRightMenuSize: 30,
    showLibraryRightMenu: false,

    // tree view
    selectedFolderId: SpecialFolder.LIBRARY.toString(),

    // projects
    openedProjectIds: new Set<string>(), // for projectTree

    // settings
    settings: {
      theme: "dark",
      language: "en_US",
      storagePath: "",
      fontSize: "16px",
      citeKeyRule: "author_title_year",
    } as Settings,

    // page
    openedPage: { id: "", type: "", label: "" },
    closedItemId: "",
    currentItemId: "library",
  }),

  actions: {
    async loadState() {
      const state = await getAppState();
      this.leftMenuSize = state.leftMenuSize || this.leftMenuSize;
      this.showLeftMenu = state.showLeftMenu || this.showLeftMenu;
      this.showPDFMenuView = state.showPDFMenuView || this.showPDFMenuView;
      this.libraryRightMenuSize =
        state.libraryRightMenuSize || this.libraryRightMenuSize;
      this.showLibraryRightMenu =
        state.showLibraryRightMenu || this.showLibraryRightMenu;
      this.ribbonToggledBtnUid =
        state.ribbonToggledBtnUid || this.ribbonToggledBtnUid;
      this.selectedFolderId = state.selectedFolderId || this.selectedFolderId;
      this.currentItemId = state.currentItemId || this.currentItemId;
      this.openedProjectIds = new Set(state.openedProjectIds); // convert to Set after loading
      this.settings = Object.assign(this.settings, state.settings); // if state.settings is missing anything, this won't hurt!

      this.ready = true;
    },

    getState(): AppState {
      return {
        _id: "appState",
        dataType: "appState",
        ribbonToggledBtnUid: this.ribbonToggledBtnUid,
        leftMenuSize: this.leftMenuSize,
        showLeftMenu: this.showLeftMenu,
        showPDFMenuView: this.showPDFMenuView,
        libraryRightMenuSize: this.libraryRightMenuSize,
        showLibraryRightMenu: this.showLibraryRightMenu,
        selectedFolderId: this.selectedFolderId,
        currentItemId: this.currentItemId,
        openedProjectIds: [...this.openedProjectIds] as string[], // convert to Array for saving
        settings: this.settings as Settings,
      } as AppState;
    },

    /**
     * Layout Control
     */

    async openPage(page: Page) {
      const projectStore = useProjectStore();
      if (page.type === "ReaderPage") await projectStore.openProject(page.id);
      else {
        let note = await projectStore.getNoteFromDB(page.id);
        if (note && note.projectId)
          await projectStore.openProject(note.projectId);
      }
      this.openedPage = page;
    },

    closePage(pageId: string) {
      if (!pageId) return;
      this.closedItemId = pageId;
    },

    /**
     * Toggle left menu
     * If visible is given, set the state as it is
     * @param visible
     */
    toggleLeftMenu(visible?: boolean) {
      if (visible === undefined) {
        this.showLeftMenu = !this.showLeftMenu;
      } else {
        this.showLeftMenu = visible;
      }
    },

    /**
     * Toggle pdf floating menu
     * If visible is given, set the state as it is
     * @param visible
     */
    togglePDFMenuView(visible?: boolean) {
      if (visible === undefined) {
        this.showPDFMenuView = !this.showPDFMenuView;
      } else {
        this.showPDFMenuView = visible;
      }
    },

    changeTheme(theme: string) {
      // ui
      switch (theme) {
        case "dark":
          Dark.set(true);
          break;
        case "light":
          Dark.set(false);
          break;
      }

      // set the vditor style so all vditors in the app can share this
      // must append editorStyle before contentStyle
      // otherwise the texts are dark
      let contentStyle = document.getElementById(
        "vditor-content-style"
      ) as HTMLStyleElement;
      if (contentStyle === null) {
        contentStyle = document.createElement("style") as HTMLStyleElement;
        contentStyle.id = "vditor-content-style";
        contentStyle.type = "text/css";
        document.head.append(contentStyle);
      }
      switch (theme) {
        case "dark":
          contentStyle.innerHTML = darkContent;
          break;
        case "light":
          contentStyle.innerHTML = lightContent;
          break;
      }

      // db
      this.settings.theme = theme;
      this.saveAppState();
    },

    changeFontSize(size: number) {
      // ui
      document.documentElement.style.fontSize = `${size}px`;

      // db
      this.settings.fontSize = `${size}px`;
      this.saveAppState();
    },

    changeLanguage(language: string) {
      // the vue-i18n can only be used in vue, not pinia

      // db
      this.settings.language = language;
      this.saveAppState();
    },

    async saveAppState() {
      if (!this.ready) return;
      const projectStore = useProjectStore();
      let state = this.getState();
      state.openedProjectIds = projectStore.openedProjects.map(
        (project) => project._id
      );
      await updateAppState(state);
    },
  },
});
