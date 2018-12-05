import Vue from 'vue';
import cloneDeep from 'lodash/cloneDeep';
import { Component } from 'vue-property-decorator';
import { Inject } from 'util/injector';
import { TFormData } from 'components/shared/forms/Input';
import { WindowsService } from 'services/windows';
import windowMixin from 'components/mixins/window';
import { ISourcesServiceApi } from 'services/sources';
import { IScenesServiceApi, ISceneItemApi } from '../../services/scenes';
import { MonitorCaptureCroppingService } from 'services/sources/monitor-capture-cropping';

import ModalLayout from 'components/ModalLayout.vue';
import Display from 'components/shared/Display.vue';
import GenericForm from 'components/shared/forms/GenericForm.vue';
import { $t } from 'services/i18n';

@Component({
  components: {
    ModalLayout,
    Display,
    GenericForm
  },
  mixins: [windowMixin]
})
export default class SourceProperties extends Vue {

  @Inject()
  sourcesService: ISourcesServiceApi;

  @Inject() 
  private scenesService: IScenesServiceApi;

  @Inject()
  windowsService: WindowsService;

  @Inject() 
  private monitorCaptureCroppingService: MonitorCaptureCroppingService;

  sourceId = this.windowsService.getChildWindowQueryParams().sourceId;
  initial = this.windowsService.getChildWindowQueryParams().initial;
  source = this.sourcesService.getSource(this.sourceId);
  properties: TFormData = [];
  initialProperties: TFormData = [];
  tainted = false;

  mounted() {
    this.properties = this.source ? this.source.getPropertiesFormData() : [];
    this.initialProperties = cloneDeep(this.properties);
  }

  get propertiesManagerUI() {
    if (this.source) return  this.source.getPropertiesManagerUI();
  }

  onInputHandler(properties: TFormData, changedIndex: number) {
    const source = this.sourcesService.getSource(this.sourceId);
    source.setPropertiesFormData(
      [properties[changedIndex]]
    );
    this.tainted = true;
    this.refresh();
  }

  refresh() {
    this.properties = this.source.getPropertiesFormData();
  }

  closeWindow() {
    this.windowsService.closeChildWindow();
  }

  done() {
    this.initlalMonitorCaptureCrop();
    this.initialFitToScreen();
    this.closeWindow();
  }

  applyFunctionToThis(func: (sceneItem: ISceneItemApi) => void) {
    const activeSceneItems = this.scenesService.activeScene.getItems();
    activeSceneItems.forEach(sceneItem => {
      if (sceneItem.sourceId === this.sourceId) {
        func(sceneItem)
      }
    });
  }

  initlalMonitorCaptureCrop() {
    if(this.initial && this.source.type === 'monitor_capture'){
      this.applyFunctionToThis((sceneItem: ISceneItemApi) => {
        this.monitorCaptureCroppingService.startCropping(
          this.scenesService.activeScene.id,
          sceneItem.sceneItemId,
          sceneItem.sourceId
        );
      });
    }
  }

  initialFitToScreen() {
    if (this.isRequireFitToScreen()){
      this.applyFunctionToThis((sceneItem: ISceneItemApi) => {
        sceneItem.fitToScreen();
      });
    }
  }

  isRequireFitToScreen() {
    console.log('isRequireFitToScreen',this.initial,this.source.type)
    if (this.initial) {
      switch(this.source.type) {
        case 'text_ft2_source':
        case 'text_gdiplus':
        case 'color_source':
        case 'wasapi_input_capture':
        case 'wasapi_output_capture':
          return false
        default:
          return true
      }
    }else{
      return false 
    }
  }

  cancel() {
    if (this.tainted) {
      const source = this.sourcesService.getSource(this.sourceId);
      source.setPropertiesFormData(
        this.initialProperties
      );
    }
    this.initialFitToScreen();
    this.closeWindow();
  }

  get windowTitle() {
    const source = this.sourcesService.getSource(this.sourceId);
    return source ? $t('sources.propertyWindowTitle', { sourceName: source.name }) : '';
  }

}
