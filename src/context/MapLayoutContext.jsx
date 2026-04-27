import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const MapLayoutContext = createContext(null);

const BASE_BOTTOM = 20;
const GAP = 10;

export const MapLayoutProvider = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panels, setPanels] = useState({});

  const rightOffset = drawerOpen ? 310 : 0;

  const registerPanel = useCallback((id, config) => {
    setPanels(prev => ({ ...prev, [id]: config }));
  }, []);

  const unregisterPanel = useCallback((id) => {
    setPanels(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Precompute bottom offset for each registered panel sorted by order
  const bottomOffsets = useMemo(() => {
    const sorted = Object.entries(panels).sort(([, a], [, b]) => a.order - b.order);
    const offsets = {};
    let acc = BASE_BOTTOM;
    sorted.forEach(([id, { height }]) => {
      offsets[id] = acc;
      acc += height + GAP;
    });
    return offsets;
  }, [panels]);

  const getBottomOffset = useCallback(
    (id) => bottomOffsets[id] ?? BASE_BOTTOM,
    [bottomOffsets]
  );

  const value = useMemo(() => ({
    rightOffset,
    setDrawerOpen,
    registerPanel,
    unregisterPanel,
    getBottomOffset,
  }), [rightOffset, registerPanel, unregisterPanel, getBottomOffset]);

  return (
    <MapLayoutContext.Provider value={value}>
      {children}
    </MapLayoutContext.Provider>
  );
};

export const useMapLayout = () => {
  const ctx = useContext(MapLayoutContext);
  if (!ctx) throw new Error('useMapLayout must be used within MapLayoutProvider');
  return ctx;
};
