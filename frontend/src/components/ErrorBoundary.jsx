import { Component } from 'react'
import { reportError } from '../observability'
import { ErrorState } from './ui'

/** A render error used to leave a blank page; now it is reported and the user can reload. */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    reportError(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <ErrorState
        title="Something broke"
        description="The page hit an unexpected error. Reload to try again."
        onRetry={() => window.location.reload()}
      />
    )
  }
}
