/**
 *  Editor Engine - Event Model
 *
 * 事件模型类，提供事件的注册、触发和管理功能
 * 支持同步和异步事件处理
 */

import { EventCallback, AsyncEventCallback } from '../types';


interface EventListener {
  callback: EventCallback;
  once?: boolean;
  rewrite?: boolean;
}

/**
 * 事件模型类
 *
 * 提供完整的事件系统，支持事件的注册、触发、移除等操作
 *
 * @example
 * ```typescript
 * const event = new EventModel();
 * event.on('test', (data) => console.log(data));
 * event.trigger('test', 'Hello World');
 * ```
 */

export class EventModel {
  /** 事件监听器映射 */
  protected listeners: Map<string, EventListener[]> = new Map()

  /**
   * 注册事件监听器
   *
   * @param eventName - 事件名称
   * @param callback - 事件回调函数
   * @param once - 是否只触发一次
   * @param rewrite - 是否覆盖已有的监听器
   * 
   * */
  on<T extends any>(eventType: string, callback: EventCallback<T>, rewrite?: boolean): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    const listeners = this.listeners.get(eventType)

    if (rewrite) {
      this.listeners.set(eventType, [{
        callback,
        rewrite: true
      }])
    } else {
      listeners?.push({ callback })
    }
  }

  /**
   * 注册一次性事件监听器
   * @param eventType - 事件类型
   * @param callback - 回调函数
   */
  once<T extends any>(eventType: string, callback: EventCallback<T>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    const listeners = this.listeners.get(eventType);
    listeners?.push({
      callback,
      once: true
    })
  }

  /**
   * 触发事件
   * @param eventType - 事件类型
   * @param data - 事件数据
   * @returns 是否继续传播事件
   */
  trigger<T extends any>(eventType: string, data?: T): boolean {
    if (!this.listeners.has(eventType)) {
      return true;
    }
    const listeners = this.listeners.get(eventType) || [];
    const listenersToRemove: EventListener[] = [];
    for (const listener of listeners) {
      try {
        const result = listener.callback(data)
        // 如果返回 false，则停止传播事件
        if (result === false) {
          return false
        }
        // 如果是一次性事件，则移除监听器
        if (listener.once) {
          listenersToRemove.push(listener)
        }
      } catch (error) {
        console.error(`Error in event listener for "${eventType}":`, error);
      }
    }
    if (listenersToRemove.length > 0) {
      const remainingListeners = listeners.filter(
        listener => !listenersToRemove.includes(listener)
      );

      if (remainingListeners.length === 0) {
        this.listeners.delete(eventType);
      } else {
        this.listeners.set(eventType, remainingListeners);
      }
    }
    return true
  }

  hasListeners(eventType: string): boolean {
    return this.listeners.has(eventType) && this.listeners.get(eventType)!.length > 0
  }


  /**
   * 获取指定事件的监听器数量
   * @param eventType - 事件类型
   * @returns 监听器数量
   */
  getListenerCount(eventType: string): number {
    return this.listeners.has(eventType) ? this.listeners.get(eventType)!.length : 0;
  }

  /**
   * 获取所有事件类型
   * @returns 事件类型数组
   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
 * 销毁事件模型
 */
  destroy(): void {
    this.clear();
  }
  /**
    * 清除所有事件监听器
    */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * 移除事件监听器
   * @param eventType - 事件类型
   * @param callback - 回调函数
   */
  off<T extends any>(eventType: string, callback: EventCallback<T>): void {
    const listeners = this.listeners.get(eventType) || [];
    const index = listeners.findIndex(listener => listener.callback === callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    if (listeners.length === 0) {
      this.listeners.delete(eventType);
    }
  }

  removeOnce(eventType: string): void {
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(listener => {
      if (listener.once) {
        this.off(eventType, listener.callback);
      }
    })
  }
}


export class AsyncEventModel extends EventModel {
  /**
     * 触发异步事件
     * @param eventType - 事件类型
     * @param data - 事件数据
     * @returns Promise，解析为是否继续传播事件
     */
  async triggerAsync<T extends any>(eventType: string, data?: T): Promise<boolean> {
    if (!this.hasListeners(eventType)) {
      return true;
    }
    const listeners = this.listeners.get(eventType)!;
    const listenersToRemove: any[] = [];

    for (const listener of listeners) {
      try {
        const result = await Promise.resolve(listener.callback(data));

        // 如果返回 false，停止事件传播
        if (result === false) {
          return false;
        }

        // 标记一次性监听器待移除
        if (listener.once) {
          listenersToRemove.push(listener);
        }
      } catch (error) {
        console.error(`Error in async event listener for "${eventType}":`, error);
      }
    }
    // 移除一次性监听器
    if (listenersToRemove.length > 0) {
      const remainingListeners = listeners.filter(
        listener => !listenersToRemove.includes(listener)
      );

      if (remainingListeners.length === 0) {
        this.listeners.delete(eventType);
      } else {
        this.listeners.set(eventType, remainingListeners);
      }
    }
    return true;
  }

  /**
 * 并行触发异步事件
 * @param eventType - 事件类型
 * @param data - 事件数据
 * @returns Promise，解析为所有监听器的结果
 */

  async triggerParallel<T extends any>(eventType: string, data?: T): Promise<(void | boolean)[]> {
    if (!this.hasListeners(eventType)) {
      return [];
    }
    const listeners = this.listeners.get(eventType)!;
    const promises = listeners.map(listener =>
      Promise.resolve(listener.callback(data)).catch(error => {
        console.error(`Error in parallel event listener for "${eventType}":`, error);
        return undefined;
      })
    );
    const results = await Promise.all(promises);

    // 移除一次性监听器
    const listenersToRemove = listeners.filter(listener => listener.once);
    if (listenersToRemove.length > 0) {
      const remainingListeners = listeners.filter(listener => !listener.once);

      if (remainingListeners.length === 0) {
        this.listeners.delete(eventType);
      } else {
        this.listeners.set(eventType, remainingListeners);
      }
    }
    return results;
  }
}


export class EventBus extends AsyncEventModel {
  private static instance: EventBus;


  /**
   * 获取单例实例
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
  * 私有构造函数，确保单例
  */
  private constructor() {
    super();
  }

}

export default EventModel;