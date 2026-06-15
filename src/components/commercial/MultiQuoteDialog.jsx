import React from 'react';
import CommercialAssistantDialog from '@/components/commercial/CommercialAssistantDialog';

export default function MultiQuoteDialog(props) {
  return <CommercialAssistantDialog {...props} mode="quote" />;
}