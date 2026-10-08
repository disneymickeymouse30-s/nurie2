import { Component, type ReactNode } from 'react';
import { ErrorView, ToastHost } from './components/ui';
import { useRoute } from './lib/router';
import { AiCreatePage } from './pages/AiCreatePage';
import { CompletePage } from './pages/CompletePage';
import { CreatePhotoPage } from './pages/CreatePhotoPage';
import { EditorPage } from './pages/EditorPage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { MyPage } from './pages/MyPage';
import { PageDetailPage } from './pages/PageDetailPage';
import { WorksPage } from './pages/WorksPage';

function Routes() {
  const { path } = useRoute();
  const [head, id] = path;
  switch (head) {
    case 'explore':
      return <ExplorePage />;
    case 'page':
      return <PageDetailPage key={id} id={id} />;
    case 'create':
      return <CreatePhotoPage />;
    case 'ai':
      return <AiCreatePage />;
    case 'edit':
      return <EditorPage key={id} id={id} />;
    case 'done':
      return <CompletePage key={id} id={id} />;
    case 'works':
      return <WorksPage />;
    case 'me':
      return <MyPage />;
    default:
      return <HomePage />;
  }
}

/** 想定外のエラーでも真っ白にせず、やさしい文言で案内する */
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error(err);
  }
  render() {
    if (this.state.failed)
      return (
        <ErrorView
          message="うまく表示できませんでした。塗っていた作品は自動で保存されています。"
          onRetry={() => {
            location.hash = '#/';
            location.reload();
          }}
        />
      );
    return this.props.children;
  }
}

export default function App() {
  return (
    <Boundary>
      <Routes />
      <ToastHost />
    </Boundary>
  );
}
