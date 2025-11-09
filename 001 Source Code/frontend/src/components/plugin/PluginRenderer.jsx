// frontend\src\components\plugin\PluginRenderer.jsx
import React from 'react';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as Recharts from 'recharts';

function PluginRenderer({ code, data, options, width, height }) {
  console.log('이거는PluginRenderer', { code, data, options });
  return (
    <div style={{width, height}}>
      <LiveProvider code={code} noInline={true} scope={{ React, Recharts, data, options, width, height }} >
        <LivePreview />
        <LiveError />
      </LiveProvider>
    </div>
  );
}

export default PluginRenderer;
