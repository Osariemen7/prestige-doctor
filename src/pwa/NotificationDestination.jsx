import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getNotification, notificationPath, readNotification } from './notificationApi';
import { ErrorState, LoadingState } from '../vnext/components';

export default function NotificationDestination({ notificationId }) {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    (async () => {
      try {
        const item = await getNotification(notificationId, controller.signal);
        if (controller.signal.aborted) return;
        const route = notificationPath(item);
        if (route.startsWith('/app/notifications/')) throw new Error('This notification has no available destination.');
        await readNotification(notificationId);
        if (controller.signal.aborted) return;
        window.dispatchEvent(new Event('doctor-notifications-changed'));
        navigate(route, { replace: true });
      } catch (failure) { if (!controller.signal.aborted) setError(failure); }
    })();
    return () => controller.abort();
  }, [notificationId, navigate, retry]);
  return <><h1>Care update</h1>{error ? <ErrorState error={error} onRetry={() => setRetry((value) => value + 1)} /> : <LoadingState label="Opening your authorized update…" />}<NavLink to="/app/notifications">Back to notifications</NavLink></>;
}
