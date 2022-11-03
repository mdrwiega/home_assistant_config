// Mini air purifier card (only buttons)

import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

class AirPurifierCard extends LitElement {
  static get properties() {
    return {
      hass: Object,
      config: Object
    };
  }

  get entity() {
    return this.hass.states[this.config.entity];
  }

  get name() {
    return this.config.name === undefined ? nothing : this.config.name;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please specify an entity!');
    }
    if (config.entity.split('.')[0] !== 'fan') {
      throw new Error('Entity is not a fan!');
    }

    this.config = config;
  }

  getCardSize() {
    return 2;
  }

  fireEvent(type, options = {}) {
    const event = new Event(type, {
        bubbles: options.bubbles || true,
        cancelable: options.cancelable || true,
        composed: options.composed || true,
    });
    event.detail = {entityId: this.entity.entity_id};
    this.dispatchEvent(event);
  }

  callService(service, options = {}, isRequest = true) {
    const [domain, name] = service.split('.');
    this.hass.callService(domain, name, {
      ...options,
    });

    if (isRequest) {
      this.requestInProgress = true;
      this.requestUpdate();
    }
  }

  getEntityState(entity_id) {
    return this.hass.states[`${entity_id}`].state;
  }

  renderToolbar() {
    const { buttons = [] } = this.config;
    const { state, attributes } = this.entity;

    const buttons_html = buttons.map(
      ({ name, icon, service, service_data, service_active_state, preset_mode, percentage }) => {
        // Execute the state
        const execute = () => {
          if (preset_mode) {
            this.callService('fan.set_preset_mode', { entity_id: this.config.entity, preset_mode });
          }

          if (service) {
            this.callService(service, service_data);
          }

          if (percentage) {
            this.callService('fan.set_percentage', { entity_id: this.config.entity, percentage: percentage });
          }
        };

        // Check if the target state is active
        let is_active;
        if (service) {
          const service_state = this.getEntityState(service_data.entity_id);
          const target_state_achieved = Number(service_state) === Number(service_active_state);
          if (preset_mode) {
            is_active = (preset_mode === attributes.preset_mode && target_state_achieved);
          }
          else {
            is_active = target_state_achieved;            
          }
        }
        else if (preset_mode && percentage) {
          is_active = (preset_mode === attributes.preset_mode && percentage === attributes.percentage);
        }
        else if (preset_mode) {
          is_active = preset_mode === attributes.preset_mode;
        }
        else if (percentage) {
          is_active = percentage === attributes.percentage
        }

        const className = is_active ? 'active' : '';

        return html`
          <ha-icon-button
            title="${name}"
            class="${className}"
            @click="${execute}"
            >
            <ha-icon icon="${icon}"/>
          </ha-icon-button>
        `;
      }
    );

    return html`
      <div class="toolbar">
        ${buttons_html}
        <ha-icon-button
          class="${state === 'on' ? 'active' : ''}"
          title="Power on/off"
          @click="${() => this.callService('fan.toggle', {entity_id: this.config.entity})}"
          >
          <ha-icon icon="hass:power"/>
        </ha-icon-button>
      </div>
    `;
  }

  render() {
    if (!this.entity) {
      return html`
        <ha-card>
          <div class="header">Entity is not available!</div>
        </ha-card>
      `;
    }

    return html`
      <ha-card>
        <div class="header">
          <div class="name">${this.name}</div>          
          <ha-icon-button
            class="more-info"
            ?more-info="true"
            @click="${() => this.fireEvent('hass-more-info')}"
            >
            <ha-icon icon="mdi:dots-vertical"/>
          </ha-icon-button>
        </div>
        ${this.renderToolbar()}
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        --pc-background: var(--ha-card-background, var(--card-background-color, white));
        --pc-text-color: var(--primary-text-color);
        --pc-icon-color: var(--secondary-text-color);
        --pc-active-icon-color: rgb(255,192,0);
        --pc-spacing: 10px;
      }
      
      ha-card {
        display: flex;
        flex-direction: column;
        flex: 1;
        position: relative;
        color: var(--pc-text-color);
        background-color: var(--pc-background);
      }
     
      ha-icon {
        padding: 0px 0px 5px 0px;
      }

      ha-icon-button {
        --mdc-icon-button-size: 24px;
        opacity: 0.6;
      }

      .header {
        padding-top: var(--pc-spacing);
        padding-left: var(--pc-spacing);
        padding-right: 4px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      .name {
        font-size: 18px;
      }

      .toolbar {
        padding: var(--pc-spacing);
        display: flex;
        flex-flow: row wrap;
        justify-content: space-between;
        gap: 5px;
      }
      
      .toolbar ha-icon-button {
        color: var(--pc-icon-color);
      }
      
      .toolbar ha-icon-button.active {
        opacity: 1;
        color: var(--pc-active-icon-color);
      }      
    `;
  }
}

customElements.define('air-purifier-card', AirPurifierCard);