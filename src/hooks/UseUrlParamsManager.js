import { useLocation, useNavigate } from 'react-router-dom';

const UseUrlParamsManager = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Obtener todos los parámetros como objeto
  const getParams = () => {
    const url = new URLSearchParams(location.search);
    const params = {};
    url.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  };

  // Agregar o actualizar parámetros
  const addParams = params => {
    const url = new URLSearchParams(location.search);

    Object.keys(params).forEach(key => {
      let value = params[key];
      // Convertir arrays a string con guiones
      if (Array.isArray(value)) {
        value = value.join('-');
      }
      url.set(key, value);
    });

    navigate({ search: url.toString() });
  };

  // Eliminar todos los parámetros
  const removeParams = () => {
    const url = new URLSearchParams();
    navigate({ search: url.toString() });
  };

  // Eliminar un parámetro específico
  const removeParam = param => {
    const url = new URLSearchParams(location.search);
    url.delete(param);
    navigate({ search: url.toString() });
  };

  return { getParams, addParams, removeParams, removeParam };
};

export default UseUrlParamsManager;
