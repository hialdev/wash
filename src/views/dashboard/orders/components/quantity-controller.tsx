import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
   value: number;
   min: number;
   onChange: (val: number) => void;
};

export function QuantityController({ value, min, onChange }: Props) {
   const [typedVal, setTypedVal] = useState(value.toString());

   // Keep local typed value in sync when parent value changes externally
   useEffect(() => {
      setTypedVal(value.toString());
   }, [value]);

   const handleBlur = () => {
      let num = parseFloat(typedVal);
      if (isNaN(num) || num < min) {
         num = min;
      }
      // Round to 2 decimal places to avoid floating point issues
      const clamped = parseFloat(num.toFixed(2));
      setTypedVal(clamped.toString());
      onChange(clamped);
   };

   const handleTextChange = (text: string) => {
      setTypedVal(text);
      const num = parseFloat(text);
      if (!isNaN(num)) {
         onChange(num); // Update parent without clamping immediately
      }
   };

   const handleInc = () => {
      const currentVal = isNaN(parseFloat(typedVal)) ? min : parseFloat(typedVal);
      const next = parseFloat((currentVal + 1).toFixed(2));
      setTypedVal(next.toString());
      onChange(next);
   };

   const handleDec = () => {
      const currentVal = isNaN(parseFloat(typedVal)) ? min : parseFloat(typedVal);
      const next = Math.max(min, parseFloat((currentVal - 1).toFixed(2)));
      setTypedVal(next.toString());
      onChange(next);
   };

   return (
      <Stack direction="row" alignItems="center" spacing={0.5}>
         <IconButton
            size="small"
            color="warning"
            onClick={handleDec}
            disabled={value <= min}
         >
            <Iconify icon="eva:minus-fill" width={16} />
         </IconButton>
         <TextField
            size="small"
            value={typedVal}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={handleBlur}
            slotProps={{
               htmlInput: {
                  type: 'number',
                  step: 0.1,
                  min: min,
                  style: {
                     textAlign: 'center',
                     width: 54,
                     padding: '6px 0',
                  },
               },
            }}
            sx={{
               '& .MuiInputBase-input': {
                  textAlign: 'center',
               },
            }}
         />
         <IconButton
            size="small"
            color="warning"
            onClick={handleInc}
         >
            <Iconify icon="eva:plus-fill" width={16} />
         </IconButton>
      </Stack>
   );
}
