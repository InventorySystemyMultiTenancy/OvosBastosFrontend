import { useCallback, useEffect, useState } from 'react';
import { customerDisplay, CustomerDisplayService } from '../services/customerDisplay.service';

export function useCustomerDisplay() {
  const [isConnected, setIsConnected] = useState(customerDisplay.isConnected);
  const [error, setError] = useState(null);
  const isSupported = CustomerDisplayService.isSupported();

  useEffect(() => {
    const unsubscribe = customerDisplay.onStatusChange((status, statusError) => {
      setIsConnected(status === 'connected');
      setError(statusError ?? null);
    });

    customerDisplay.autoReconnect().then((connected) => {
      if (connected) setIsConnected(true);
    });

    return unsubscribe;
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await customerDisplay.connect();
    } catch (err) {
      setError(err);
    }
  }, []);

  const disconnect = useCallback(() => customerDisplay.disconnect(), []);

  const sendAmount = useCallback(async (value, type) => {
    try {
      await customerDisplay.sendAmount(value, type);
    } catch (err) {
      setError(err);
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      await customerDisplay.clear();
    } catch (err) {
      setError(err);
    }
  }, []);

  return { isSupported, isConnected, error, connect, disconnect, sendAmount, clear };
}
