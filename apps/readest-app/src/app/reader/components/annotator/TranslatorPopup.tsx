import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import Popup from '@/components/Popup';
import { Position } from '@/utils/sel';
import { useAuth } from '@/context/AuthContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useTranslator } from '@/hooks/useTranslator';
import { TRANSLATED_LANGS } from '@/services/constants';
import { TranslatorName } from '@/services/translators';

const notSupportedLangs = ['hi', 'vi'];

const generateTranslatorLangs = () => {
  const langs = { ...TRANSLATED_LANGS };
  const result: Record<string, string> = {};
  for (const [code, name] of Object.entries(langs)) {
    if (notSupportedLangs.includes(code)) continue;
    let newCode = code.toUpperCase();
    if (newCode === 'ZH-CN') {
      newCode = 'ZH-HANS';
    } else if (newCode === 'ZH-TW') {
      newCode = 'ZH-HANT';
    }
    result[newCode] = name;
  }
  return result;
};

const TRANSLATOR_LANGS = generateTranslatorLangs();

interface TranslatorPopupProps {
  text: string;
  position: Position;
  trianglePosition: Position;
  popupWidth: number;
  popupHeight: number;
}

interface TranslatorType {
  name: string;
  label: string;
}

const TranslatorPopup: React.FC<TranslatorPopupProps> = ({
  text,
  position,
  trianglePosition,
  popupWidth,
  popupHeight,
}) => {
  const _ = useTranslation();
  const { token } = useAuth();
  const { settings, setSettings } = useSettingsStore();
  const [providers, setProviders] = useState<TranslatorType[]>([]);
  const [provider, setProvider] = useState<TranslatorName>(
    settings.globalReadSettings.translationProvider as TranslatorName,
  );
  const [sourceLang, setSourceLang] = useState('AUTO');
  const [targetLang, setTargetLang] = useState(settings.globalReadSettings.translateTargetLang);
  const [translation, setTranslation] = useState<string | null>(null);
  const [detectedSourceLang, setDetectedSourceLang] = useState<
    keyof typeof TRANSLATOR_LANGS | null
  >(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { translate, translators } = useTranslator({
    provider,
    sourceLang,
    targetLang,
  });

  const handleSourceLangChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSourceLang(event.target.value);
  };

  const handleTargetLangChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    settings.globalReadSettings.translateTargetLang = event.target.value;
    setSettings(settings);
    setTargetLang(event.target.value);
  };

  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTranslator = translators.find((t) => t.name === event.target.value);
    if (selectedTranslator) {
      settings.globalReadSettings.translationProvider = selectedTranslator.name;
      setSettings(settings);
      setProvider(selectedTranslator.name as TranslatorName);
    }
  };

  useEffect(() => {
    const availableProviders = translators.map((t) => {
      return { name: t.name, label: t.label };
    });
    setProviders(availableProviders);
  }, [translators]);

  useEffect(() => {
    setLoading(true);
    const fetchTranslation = async () => {
      setError(null);
      setTranslation(null);

      try {
        const input = text.replaceAll('\n', ' ').trim();
        const result = await translate([input]);
        const translatedText = result[0];
        const detectedSource = null;

        if (!translatedText) {
          throw new Error('No translation found');
        }

        setTranslation(translatedText);
        if (sourceLang === 'AUTO' && detectedSource) {
          setDetectedSourceLang(detectedSource);
        }
      } catch (err) {
        console.error(err);
        if (!token) {
          setError(_('Unable to fetch the translation. Please log in first and try again.'));
        } else {
          setError(_('Unable to fetch the translation. Try again later.'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTranslation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, token, sourceLang, targetLang, provider]);

  return (
    <div>
      <Popup
        trianglePosition={trianglePosition}
        width={popupWidth}
        minHeight={popupHeight}
        maxHeight={720}
        position={position}
        className='grid h-full select-text grid-rows-[1fr,auto,1fr] bg-gray-600 text-white'
        triangleClassName='text-gray-600'
      >
        <div className='overflow-y-auto p-4 font-sans'>
          <div className='mb-2 flex items-center justify-between'>
            <h1 className='text-sm font-normal'>{_('Original Text')}</h1>
            <select
              value={sourceLang}
              onChange={handleSourceLangChange}
              className={clsx(
                'select h-8 min-h-8 rounded-md border-none text-end text-sm',
                'bg-gray-600 text-white/75 focus:outline-none focus:ring-0',
              )}
            >
              {[
                ['AUTO', _('Auto Detect')],
                ...Object.entries(TRANSLATOR_LANGS).sort((a, b) => a[1].localeCompare(b[1])),
              ].map(([code, name]) => {
                return (
                  <option key={code} value={code}>
                    {detectedSourceLang && sourceLang === 'AUTO' && code === 'AUTO'
                      ? `${TRANSLATOR_LANGS[detectedSourceLang] || detectedSourceLang} ` +
                        _('(detected)')
                      : name}
                  </option>
                );
              })}
            </select>
          </div>
          <p className='text-base text-white/90'>{text}</p>
        </div>

        <div className='mx-4 flex-shrink-0 border-t border-gray-500/30'></div>

        <div className='overflow-y-auto px-4 pt-4 font-sans'>
          <div className='mb-2 flex items-center justify-between'>
            <h2 className='text-sm font-normal'>{_('Translated Text')}</h2>
            <select
              value={targetLang}
              onChange={handleTargetLangChange}
              className={clsx(
                'select h-8 min-h-8 rounded-md border-none text-end text-sm',
                'bg-gray-600 text-white/75 focus:outline-none focus:ring-0',
              )}
            >
              {Object.entries(TRANSLATOR_LANGS)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          {loading ? (
            <p className='text-base italic text-gray-500'>{_('Loading...')}</p>
          ) : (
            <div>
              {error ? (
                <p className='text-base text-red-600'>{error}</p>
              ) : (
                <p className='text-base text-white/90'>
                  {translation || _('No translation available.')}
                </p>
              )}
              <div className='flex h-10 items-center justify-between pt-4'>
                {provider && (
                  <div className='text-xs opacity-60'>
                    {error
                      ? ''
                      : _('Translated by {{provider}}.', {
                          provider: providers.find((p) => p.name === provider)?.label,
                        })}
                  </div>
                )}
                <select
                  value={provider}
                  onChange={handleProviderChange}
                  className={clsx(
                    'select h-8 min-h-8 rounded-md border-none text-end text-sm',
                    'bg-gray-600 text-white/75 focus:outline-none focus:ring-0',
                  )}
                >
                  {providers.map(({ name, label }) => (
                    <option key={name} value={name}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </Popup>
    </div>
  );
};

export default TranslatorPopup;
