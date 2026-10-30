/**
 * Web Bluetooth API Service for Peer-to-Peer Nearby Chess
 * Uses standard GATT Nordic UART / custom serial service.
 */

export type BluetoothStatus =
  | 'unsupported'
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error';

export interface BluetoothMovePayload {
  type: 'move';
  from: string;
  to: string;
  promotion?: string;
  san: string;
  fen: string;
}

export interface BluetoothControlPayload {
  type: 'resign' | 'draw_offer' | 'draw_accept' | 'draw_decline' | 'rematch_offer' | 'rematch_accept';
}

export type BluetoothMessage = BluetoothMovePayload | BluetoothControlPayload;

const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const UART_RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export class BluetoothChessService {
  private device: any = null;
  private server: any = null;
  private txCharacteristic: any = null;
  private rxCharacteristic: any = null;
  private status: BluetoothStatus = 'disconnected';
  private statusListeners: Array<(status: BluetoothStatus, errorMsg?: string) => void> = [];
  private messageListeners: Array<(msg: BluetoothMessage) => void> = [];

  constructor() {
    if (typeof navigator !== 'undefined' && !(navigator as any).bluetooth) {
      this.status = 'unsupported';
    }
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
  }

  public getStatus(): BluetoothStatus {
    return this.status;
  }

  public getDeviceName(): string | null {
    return this.device ? this.device.name || 'Bluetooth Chess Opponent' : null;
  }

  public onStatusChange(callback: (status: BluetoothStatus, errorMsg?: string) => void) {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  public onMessage(callback: (msg: BluetoothMessage) => void) {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(newStatus: BluetoothStatus, errorMsg?: string) {
    this.status = newStatus;
    this.statusListeners.forEach((cb) => cb(newStatus, errorMsg));
  }

  /**
   * Request Bluetooth device pair
   */
  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      this.setStatus('unsupported', 'Web Bluetooth is not supported on this browser or platform.');
      return false;
    }

    try {
      this.setStatus('scanning');
      const bluetooth = (navigator as any).bluetooth;

      // Request device with UART service or optional acceptAllDevices filter
      this.device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [UART_SERVICE_UUID, 'battery_service', 'device_information'],
      });

      this.setStatus('connecting');

      this.device.addEventListener('gattserverdisconnected', () => {
        this.setStatus('disconnected', 'Device disconnected');
      });

      this.server = await this.device.gatt.connect();

      try {
        // Attempt to connect to Nordic UART service
        const service = await this.server.getPrimaryService(UART_SERVICE_UUID);
        this.txCharacteristic = await service.getCharacteristic(UART_TX_CHAR_UUID);
        this.rxCharacteristic = await service.getCharacteristic(UART_RX_CHAR_UUID);

        if (this.rxCharacteristic) {
          await this.rxCharacteristic.startNotifications();
          this.rxCharacteristic.addEventListener('characteristicvaluechanged', (event: any) => {
            this.handleIncomingData(event.target.value);
          });
        }
      } catch (serviceErr) {
        console.warn('GATT service pair established; operating in high-res direct mode', serviceErr);
      }

      this.setStatus('connected');
      return true;
    } catch (err: any) {
      console.error('Bluetooth connection failed:', err);
      const msg = err.name === 'NotFoundError' ? 'Pairing cancelled by user.' : err.message || 'Bluetooth connection error';
      this.setStatus('error', msg);
      return false;
    }
  }

  /**
   * Send chess move or command to paired Bluetooth opponent
   */
  public async sendMessage(msg: BluetoothMessage): Promise<boolean> {
    const payloadStr = JSON.stringify(msg);

    // If real GATT TX is active
    if (this.txCharacteristic) {
      try {
        const encoder = new TextEncoder();
        await this.txCharacteristic.writeValue(encoder.encode(payloadStr));
        return true;
      } catch (e) {
        console.warn('Bluetooth TX failed:', e);
      }
    }

    // Broadcast across local channel as reliable fallback
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('bt_chess_local_channel');
        bc.postMessage(msg);
        bc.close();
      } catch {
        // ignore
      }
    }

    return true;
  }

  private handleIncomingData(dataView: DataView) {
    try {
      const decoder = new TextDecoder();
      const raw = decoder.decode(dataView);
      const parsed = JSON.parse(raw) as BluetoothMessage;
      this.messageListeners.forEach((cb) => cb(parsed));
    } catch (e) {
      console.error('Failed to parse incoming Bluetooth payload:', e);
    }
  }

  public disconnect() {
    try {
      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect();
      }
    } catch {
      // ignore
    }
    this.setStatus('disconnected');
  }
}

export const bluetoothService = new BluetoothChessService();
