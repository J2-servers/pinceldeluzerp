import React from 'react';
import CommercialAssistantDialog from '@/components/commercial/CommercialAssistantDialog';

export default function MultiSaleDialog(props) {
  return <CommercialAssistantDialog {...props} mode="sale" />;
}