import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { Button } from '../components/ui';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <span className="text-6xl font-black text-brand-yellow">404</span>
      <h2 className="text-2xl font-black text-surface-primary mt-2">Trang không tồn tại</h2>
      <p className="text-sm font-bold text-surface-secondary mt-1 max-w-sm">
        Trang bạn đang tìm kiếm có thể đã được di chuyển hoặc chưa được khởi tạo.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="primary"
          size="md"
          leftIcon={<Compass className="w-4 h-4" />}
          onClick={() => navigate('/')}
        >
          Về Lộ trình
        </Button>
      </div>
    </div>
  );
};
