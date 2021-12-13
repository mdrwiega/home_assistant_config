import { LitElement, html } from 'https://unpkg.com/@polymer/lit-element@0.6.5/lit-element.js?module';

const styles = html`
  <style>
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
    }
    ha-card {
      flex-direction: column;
      flex: 1;
      position: relative;
      padding: 0px;
      border-radius: 4px;
      overflow: hidden;
    }
    .preview {
      background: #77a9d1; /* fallback for old browsers */
      background: -webkit-linear-gradient(to bottom, #77a9d1, #528cbb); /* Chrome 10-25, Safari 5.1-6 */
      background: linear-gradient(to bottom, #77a9d1, #528cbb); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
      overflow: hidden;
      position: relative;
      min-height: 270px;
    }
    .preview img {
      position: absolute;
      bottom: -40px;
      left: -55px;
      transition: all 0.1s linear;
    }
    .preview .knob {
      background: #eee;
      position: absolute;
      right: 20px;
      bottom: 20px;
      border-radius: 35px;
      width: 40px;
      overflow: hidden;
      height: 180px;
      vertical-align:bottom
    }
    .preview .knob .knob-button {
      display: block;
      height: 90px;
      width: 40px;
      --mdc-icon-size: 40px;
      position: absoulute;
    }
    .preview .knob .knob-button ha-icon {
      position: relative;
      text-align: center;
      top:20px;
      color: #030303;
    }
    .preview .knob .knob-button:active {
      background: rgba(0, 0, 0, 0.06);
    }
    .height {
      position: absolute;
      left: 40px;
      top: 40px;
      font-size: 30px;
      font-weight: bold;
      transition: all 0.2s linear;
    }
    .height span {
      opacity: 0.6;
    }
    .presets-container {
      position: absolute;
      right: 0px;
      top: 10px;
      width: 100px;
    }
  </style>
`

class LinakDeskCard extends LitElement {
  static get properties() {
    return {
      hass: Object,
      config: Object,
      stepBy: Object,
      targetHeight: Object
    }
  }

  get entity() {
    return this.hass.states[this.config.entity]
  }

  get alpha() {
    return (this.targetHeight - this.minHeight) / (this.maxHeight - this.minHeight)
  }

  get maxHeight() {
    return this.config.height.max
  }

  get minHeight() {
    return this.config.height.min
  }

  handleMore() {
    const e = new Event('hass-more-info', { bubbles: true, composed: true })
    e.detail = { entityId: this.entity.entity_id }
    this.dispatchEvent(e);
  }

  callService(service, options = {}) {
    const [domain, name] = service.split('.');
    this.hass.callService(domain, name, {
      entity_id: this.config.entity,
      ...options
    });
  }

  handlePreset(e) {
    const height = parseInt(e.target.getAttribute('value'))
    this.targetHeight = height
    this.updateHeight()
  }

  renderPresets() {
    const presets = this.config.presets
    const selected = presets.find(({ target }) => target == this.targetHeight)
    const preset = selected ? selected.label : 'Custom'

    return html`
      <paper-menu-button class='preset-menu' slot='dropdown-trigger'
        .horizontalAlign=${'right'} .verticalAlign=${'top'}
        .verticalOffset=${40} .noAnimations=${true}
        @click='${(e) => e.stopPropagation()}'>
        <paper-button class='preset-menu__button' slot='dropdown-trigger'>
          <span class='preset-menu__preset' show=${true}>
            ${preset}
          </span>
          <ha-icon icon="mdi:unfold-more-horizontal"></ha-icon>
        </paper-button>
        <paper-listbox slot='dropdown-content' selected=${preset}
          @click='${(e) => this.handlePreset(e)}'>
          ${presets.map(item => html`<paper-item value=${item.target}>${item.label}</paper-item>`)}
        </paper-listbox>
      </paper-menu-button>`;
  }

  tick() {
    this.targetHeight += this.stepBy
    if (this.targetHeight > this.maxHeight) {
      this.targetHeight = this.maxHeight
    } else if (this.targetHeight < this.minHeight) {
      this.targetHeight = this.minHeight
    } else {
      this.tickTimer = setTimeout(() => this.tick(), 100)
    }
  }

  updateHeight() {
    this.callService('script.set_linak_desk_height', { height_cm: this.targetHeight })
  }

  incPressed(e) {
    this.stepBy = 1
    this.tick()
  }

  decPressed(e) {
    this.stepBy = -1
    this.tick()
  }

  cancelPress(e) {
    this.updateHeight()
    this.stepBy = 0
    if (this.tickTimer) {
      clearTimeout(this.tickTimer)
      this.tickTimer = null
    }
  }

  calculateOffset(maxValue) {
    return Math.round(maxValue * (1.0 - this.alpha))
  }

  render() {
    return html`
      ${styles}
      <ha-card>
        <div class="preview">
          <img src="/local/custom-lovelace/linak-desk/table_top.png" style="transform: scale(0.7) translateY(${this.calculateOffset(90)}px);" />
          <img src="/local/custom-lovelace/linak-desk/table_middle.png" style="transform: scale(0.7) translateY(${this.calculateOffset(60)}px);" />
          <img src="/local/custom-lovelace/linak-desk/table_bottom.png" style="transform: scale(0.7);"/>
          <div class="height" style="transform: scale(0.7) translateY(${this.calculateOffset(90)}px);">
            ${this.targetHeight}
            <span>cm</span>
          </div>
          <div class="knob">
            <div class="knob-button" 
                 @touchstart='${() => this.incPressed()}' 
                 @mousedown='${() => this.incPressed()}' 
                 @touchend='${() => this.cancelPress()}'
                 @mouseup='${() => this.cancelPress()}'>
              <ha-icon icon="mdi:chevron-up"></ha-icon>
            </div>
            <div class="knob-button" 
                 @touchstart='${() => this.decPressed()}' 
                 @mousedown='${() => this.decPressed()}' 
                 @touchend='${() => this.cancelPress()}'
                 @mouseup='${() => this.cancelPress()}'>
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </div>
          </div>
          <div class="presets-container">
            ${this.renderPresets()}
            <paper-icon-button icon="hass:dots-vertical" @click='${() => this.handleMore()}' />
          </div>
        </div>
      </ha-card>
    `
  }

  setConfig(config) {
    this.config = config;
    this.targetHeight = config.height.min
  }

  getCardSize() {
    return 2;
  }
}

customElements.define('linak-desk', LinakDeskCard);