import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const TranslatedText = ({ 
  path, 
  values = {}, 
  as: Tag = 'span',
  className = '',
  children 
}) => {
  const { t } = useTranslation();
  
  // Если есть children - используем их как текст для перевода
  const text = children ? t(children, values) : t(path, values);
  
  return <Tag className={className}>{text}</Tag>;
};

export default TranslatedText;
